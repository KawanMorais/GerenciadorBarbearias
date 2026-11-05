using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using BarbeariaApi.Data;
using BarbeariaApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Corpo da requisição limitado a 1 MB (fotos têm limite próprio).
builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = 1024 * 1024);

// ---------- Banco de dados (MySQL) ----------
// Conexão vem do User Secrets, nunca de arquivo do projeto.
var conexao = builder.Configuration.GetConnectionString("Banco");
if (string.IsNullOrWhiteSpace(conexao))
    throw new InvalidOperationException("Falta a conexão com o MySQL. Veja o passo 1 do README.");
builder.Services.AddDbContext<AppDbContext>(options => options.UseMySQL(conexao));

// ---------- Camada de serviços (regras de negócio) ----------
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<BarbeariaService>();
builder.Services.AddScoped<ServicoService>();
builder.Services.AddScoped<FuncionarioService>();
builder.Services.AddScoped<AgendamentoService>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<UploadService>();

// Tarefas em segundo plano
builder.Services.AddSingleton<EmailService>();   // uma fila só de e-mails para o sistema todo
builder.Services.AddHostedService(sp => sp.GetRequiredService<EmailService>());
builder.Services.AddHostedService<LembreteService>();   // lembretes 24h e 1h antes
builder.Services.AddHostedService<BackupService>();     // backup diário do banco

// ---------- Controllers e formato do JSON ----------
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());   // status como texto: "Confirmado"
    o.JsonSerializerOptions.Converters.Add(new HoraJsonConverter());         // horas como "18:30"
});

// ---------- Login com JWT ----------
var chaveJwt = builder.Configuration["Jwt:Chave"] ?? "";
if (Encoding.UTF8.GetByteCount(chaveJwt) < 32)
    throw new InvalidOperationException("A chave do JWT (Jwt:Chave) precisa ter pelo menos 32 caracteres. Veja o README.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;   // mantém os nomes originais ("sub", "barbeariaId")
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Emissor"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Emissor"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(chaveJwt)),
        };
    });
builder.Services.AddAuthorization();

// ---------- Limite de requisições por IP ----------
// Geral: 120/min. Política "tentativas" (login, cadastro, agendar, consulta): 10/min.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 120, Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy(LimiteTentativas.Politica, http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

// ---------- CORS: libera só o front React a chamar a API ----------
var origensFront = builder.Configuration.GetSection("Cors:Origens").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(o => o.AddPolicy("Front", p =>
    p.WithOrigins(origensFront).AllowAnyHeader().AllowAnyMethod()));

// ---------- Swagger: página para testar a API (só em desenvolvimento) ----------
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "API Barbearias", Version = "v1" });
    c.MapType<TimeOnly>(() => new OpenApiSchema { Type = JsonSchemaType.String, Example = "18:30" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Cole aqui o token recebido no login.",
    });
    c.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", doc)] = new List<string>(),
    });
});

var app = builder.Build();

// Cria/atualiza as tabelas do banco automaticamente ao iniciar (migrations).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    if (app.Configuration.GetValue<bool>("CriarDadosDemo"))
        await DadosDemo.CriarSeNaoExistir(db);
}

// Erros de regra de negócio viram respostas com { "mensagem": "..." }.
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (RegraException ex)
    {
        context.Response.StatusCode = ex.StatusCode;
        await context.Response.WriteAsJsonAsync(new { mensagem = ex.Message });
    }
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();   // http://localhost:5222/swagger
}
else
{
    app.UseExceptionHandler(e => e.Run(async ctx =>   // sem detalhes do erro em produção
    {
        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await ctx.Response.WriteAsJsonAsync(new { mensagem = "Erro inesperado. Tente novamente." });
    }));
    app.UseHsts();
    app.UseHttpsRedirection();   // em produção, só HTTPS
}

// Impede o navegador de tratar uma foto enviada como HTML.
app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    await next();
});

app.UseStaticFiles();   // fotos (e o site, na versão em pacote)
app.UseCors("Front");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Versão em pacote: rotas que não são da API abrem o site (React).
app.MapFallbackToFile("index.html");

app.Run();

public static class LimiteTentativas
{
    public const string Politica = "tentativas";
}
