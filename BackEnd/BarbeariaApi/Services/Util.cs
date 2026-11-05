using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BarbeariaApi.Services;

// Hora do sistema sempre em Brasília.
public static class Relogio
{
    private static readonly TimeZoneInfo Fuso = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    public static DateTime Agora() => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Fuso);
    public static DateOnly Hoje() => DateOnly.FromDateTime(Agora());
}

public static class Texto
{
    // "José da Silva" -> "jose da silva"
    public static string Normalizar(string s)
    {
        var semAcento = new StringBuilder();
        foreach (var c in s.Trim().Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                semAcento.Append(c);
        }
        var partes = semAcento.ToString().ToLowerInvariant()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', partes);
    }

    // Aceita nome completo ou só o primeiro, sem diferenciar maiúsculas e acentos.
    public static bool NomeConfere(string nomeCadastrado, string nomeDigitado)
    {
        var cadastrado = Normalizar(nomeCadastrado);
        var digitado = Normalizar(nomeDigitado);
        if (digitado.Length == 0) return false;
        return cadastrado == digitado || cadastrado.Split(' ')[0] == digitado;
    }

    // Ex.: "K7M2QX" (sem 0/O e 1/I).
    public static string GerarCodigo(int tamanho = 6)
    {
        const string alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var sb = new StringBuilder(tamanho);
        for (int i = 0; i < tamanho; i++)
            sb.Append(alfabeto[RandomNumberGenerator.GetInt32(alfabeto.Length)]);
        return sb.ToString();
    }
}

// Horas no JSON como "18:30".
public class HoraJsonConverter : JsonConverter<TimeOnly>
{
    public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var texto = reader.GetString() ?? "";
        if (TimeOnly.TryParseExact(texto, new[] { "HH:mm", "HH:mm:ss" }, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var hora))
            return hora;
        throw new JsonException($"Hora inválida: '{texto}'. Use o formato HH:mm, ex.: 18:30.");
    }

    public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString("HH:mm", CultureInfo.InvariantCulture));
}

