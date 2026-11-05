namespace BarbeariaApi.Services;

// Erro de regra de negócio; vira { "mensagem": "..." } na resposta.
public class RegraException : Exception
{
    public int StatusCode { get; }
    public RegraException(string mensagem, int statusCode = 400) : base(mensagem) => StatusCode = statusCode;

    public static RegraException NaoEncontrado(string oque) => new($"{oque} não encontrado.", 404);
}
