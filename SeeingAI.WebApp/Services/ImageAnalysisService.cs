using System.Diagnostics;
using System.Linq;
using System.Text;
using Microsoft.AspNetCore.Http;
using OpenTelemetry.Trace;

namespace SeeingAI.WebApp.Services;

public sealed class BufferOverflowException : Exception
{
    public BufferOverflowException(string message) : base(message)
    {
    }
}

public sealed record ImageAnalysisResult(
    string FileName,
    string ContentType,
    long FileSizeBytes,
    string ExtractedText,
    double Confidence,
    string CorrelationId,
    long ProcessingDurationMilliseconds,
    IReadOnlyDictionary<string, string> Diagnostics);

public sealed class ImageAnalysisService
{
    private const int BufferLimitBytes = 512 * 1024; // 512 KB
    private static readonly byte[] OverflowSignature = Encoding.ASCII.GetBytes("OVERFLOW");

    private readonly ILogger<ImageAnalysisService> _logger;
    private readonly ActivitySource _activitySource;

    public ImageAnalysisService(ILogger<ImageAnalysisService> logger, ActivitySource activitySource)
    {
        _logger = logger;
        _activitySource = activitySource;
    }

    public async Task<ImageAnalysisResult> AnalyzeAsync(IFormFile image)
    {
        if (image is null)
        {
            throw new ArgumentNullException(nameof(image));
        }

        var correlationId = Guid.NewGuid().ToString("N");
        var stopwatch = Stopwatch.StartNew();

        using var activity = _activitySource.StartActivity("SeeingAI.AnalyzeImage", ActivityKind.Internal);
        activity?.SetTag("image.fileName", image.FileName);
        activity?.SetTag("image.contentType", image.ContentType);
        activity?.SetTag("incident.correlationId", correlationId);

        if (image.Length == 0)
        {
            var ex = new ArgumentException("Uploaded image is empty.", nameof(image));
            RecordException(activity, ex);
            throw ex;
        }

        await using var memoryStream = new MemoryStream();
        await image.CopyToAsync(memoryStream);
        var bytes = memoryStream.ToArray();

        activity?.SetTag("image.size", bytes.Length);

        if (bytes.Length > BufferLimitBytes || ContainsOverflowSignature(bytes))
        {
            var message = $"Detected unsafe buffer size while processing {image.FileName}. Limit {BufferLimitBytes} bytes, actual {bytes.Length} bytes.";
            var overflowException = new BufferOverflowException(message);
            RecordException(activity, overflowException);
            _logger.LogError(overflowException, "Buffer overflow while analyzing {FileName}. CorrelationId: {CorrelationId}", image.FileName, correlationId);
            throw overflowException;
        }

        var extractedText = SimulateOcr(image.FileName, bytes);
        var confidence = CalculateConfidence(bytes.Length);

        stopwatch.Stop();
        activity?.SetStatus(ActivityStatusCode.Ok, "Image processed successfully");
        activity?.AddEvent(new ActivityEvent("ImageAnalysisCompleted", tags: new ActivityTagsCollection
        {
            { "confidence", confidence },
            { "correlationId", correlationId }
        }));

        _logger.LogInformation("Image analysis completed for {FileName} with confidence {Confidence}. CorrelationId: {CorrelationId}", image.FileName, confidence, correlationId);

        var diagnostics = new Dictionary<string, string>
        {
            ["bufferLimitBytes"] = BufferLimitBytes.ToString(),
            ["hashPrefix"] = BitConverter.ToString(bytes.Take(8).ToArray()),
            ["correlationId"] = correlationId,
            ["processingMs"] = stopwatch.ElapsedMilliseconds.ToString()
        };

        return new ImageAnalysisResult(
            FileName: image.FileName,
            ContentType: image.ContentType,
            FileSizeBytes: bytes.Length,
            ExtractedText: extractedText,
            Confidence: confidence,
            CorrelationId: correlationId,
            ProcessingDurationMilliseconds: stopwatch.ElapsedMilliseconds,
            Diagnostics: diagnostics);
    }

    private static void RecordException(Activity? activity, Exception exception)
    {
        if (activity is null)
        {
            return;
        }

        activity.SetStatus(ActivityStatusCode.Error, exception.Message);
        activity.AddEvent(new ActivityEvent("exception", tags: new ActivityTagsCollection
        {
            ["exception.type"] = exception.GetType().FullName ?? exception.GetType().Name,
            ["exception.message"] = exception.Message
        }));
    }

    private static bool ContainsOverflowSignature(byte[] bytes)
    {
        if (bytes.Length < OverflowSignature.Length)
        {
            return false;
        }

        static bool ContainsSignatureAt(ReadOnlySpan<byte> source, ReadOnlySpan<byte> signature)
        {
            for (var i = 0; i < signature.Length; i++)
            {
                if (source[i] != signature[i])
                {
                    return false;
                }
            }

            return true;
        }

        return ContainsSignatureAt(bytes.AsSpan(0, OverflowSignature.Length), OverflowSignature)
               || ContainsSignatureAt(bytes.AsSpan(bytes.Length - OverflowSignature.Length), OverflowSignature);
    }

    private static string SimulateOcr(string fileName, byte[] bytes)
    {
        var snippet = Encoding.UTF8.GetString(bytes, 0, Math.Min(bytes.Length, 160));
        return snippet.Length switch
        {
            0 => "\u2753 Unable to detect text.",
            < 60 => $"Simulated OCR output for {fileName}: {snippet}",
            _ => $"Simulated OCR output for {fileName}: {snippet[..60]}..."
        };
    }

    private static double CalculateConfidence(long sizeBytes)
    {
        var confidence = Math.Max(35d, 98d - (sizeBytes / 4096d));
        return Math.Round(confidence, 2, MidpointRounding.AwayFromZero);
    }
}
