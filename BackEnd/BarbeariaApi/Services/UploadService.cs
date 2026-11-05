namespace BarbeariaApi.Services;

// Salva imagens em wwwroot/uploads e devolve o caminho ("/uploads/abc.jpg").
public class UploadService
{
    private const long TamanhoMaximo = 2 * 1024 * 1024;                   // 2 MB por imagem
    public const long TamanhoMaximoRequisicao = TamanhoMaximo + 64 * 1024; // folga para o formulário

    // Bytes iniciais de cada formato (null = qualquer byte), para barrar arquivo renomeado.
    private static readonly Dictionary<string, int?[]> Assinaturas = new()
    {
        [".jpg"] = new int?[] { 0xFF, 0xD8, 0xFF },
        [".png"] = new int?[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A },
        [".webp"] = new int?[] { 'R', 'I', 'F', 'F', null, null, null, null, 'W', 'E', 'B', 'P' },
    };

    private readonly IWebHostEnvironment _env;

    public UploadService(IWebHostEnvironment env) => _env = env;

    public async Task<string> SalvarImagem(IFormFile arquivo)
    {
        if (arquivo == null || arquivo.Length == 0)
            throw new RegraException("Envie uma imagem.");
        if (arquivo.Length > TamanhoMaximo)
            throw new RegraException("A imagem pode ter no máximo 2 MB.");

        var extensao = Path.GetExtension(arquivo.FileName).ToLowerInvariant();
        if (extensao == ".jpeg") extensao = ".jpg";
        if (!Assinaturas.TryGetValue(extensao, out var assinatura) || !await ComecaCom(arquivo, assinatura))
            throw new RegraException("Formato não aceito. Use uma imagem JPG, PNG ou WEBP.");

        // Nome gerado pelo servidor, nunca o enviado.
        var pasta = Path.Combine(_env.WebRootPath, "uploads");
        Directory.CreateDirectory(pasta);
        var nome = $"{Guid.NewGuid():N}{extensao}";

        await using var destino = File.Create(Path.Combine(pasta, nome));
        await arquivo.CopyToAsync(destino);
        return $"/uploads/{nome}";
    }

    public void Apagar(string? url)
    {
        if (string.IsNullOrEmpty(url) || !url.StartsWith("/uploads/")) return;
        var caminho = Path.Combine(_env.WebRootPath, "uploads", Path.GetFileName(url));
        if (File.Exists(caminho)) File.Delete(caminho);
    }

    private static async Task<bool> ComecaCom(IFormFile arquivo, int?[] assinatura)
    {
        var inicio = new byte[assinatura.Length];
        await using var stream = arquivo.OpenReadStream();
        var lidos = await stream.ReadAtLeastAsync(inicio, inicio.Length, throwOnEndOfStream: false);
        return lidos == inicio.Length && assinatura.Select((b, i) => b == null || b == inicio[i]).All(ok => ok);
    }
}
