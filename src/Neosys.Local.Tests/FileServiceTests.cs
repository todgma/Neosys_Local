using Neosys.Local.Core.Services;

namespace Neosys.Local.Tests;

public class FileServiceTests
{
    [Fact]
    public async Task 첨부_목록_삭제()
    {
        using var t = new TestDb();
        var root = Path.Combine(Path.GetTempPath(), $"neosys_files_{Guid.NewGuid():N}");
        var src = Path.Combine(Path.GetTempPath(), $"평면도_{Guid.NewGuid():N}.png");
        await File.WriteAllBytesAsync(src, new byte[] { 0x89, 0x50, 0x4E, 0x47, 1, 2, 3 });
        try
        {
            var svc = new FileService(t.Sp, t.SessionAccessor, root);
            var row = await svc.AttachAsync(FileKind.FloorPlan, "15", src, "84A 평면도");
            Assert.True(row.Long("file_id") > 0);
            Assert.Equal("image/png", row.Str("content_type"));

            var list = await svc.ListAsync(FileKind.FloorPlan, "15");
            Assert.Single(list);
            Assert.Empty(await svc.ListAsync(FileKind.PropertyPhoto, "15"));   // 종류가 다르면 안 섞인다
            var path = svc.PathOf(list[0]);
            Assert.NotNull(path);
            Assert.StartsWith(root, path);
            Assert.Equal(7, new FileInfo(path!).Length);
            Assert.Equal(Path.GetFileName(src), list[0].Str("orig_name"));

            await svc.DeleteAsync(row.Long("file_id")!.Value);
            Assert.Empty(await svc.ListAsync(FileKind.FloorPlan, "15"));
            Assert.False(File.Exists(path));
            Assert.True(Directory.GetFiles(Path.Combine(root, "_trash"), "*", SearchOption.AllDirectories).Length == 1);
        }
        finally
        {
            File.Delete(src);
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    public async Task 저장전_대상이나_큰파일은_거부()
    {
        using var t = new TestDb();
        var root = Path.Combine(Path.GetTempPath(), $"neosys_files_{Guid.NewGuid():N}");
        var big = Path.Combine(Path.GetTempPath(), $"big_{Guid.NewGuid():N}.pdf");
        await File.WriteAllBytesAsync(big, new byte[5 * 1024 * 1024 + 1]);
        try
        {
            var svc = new FileService(t.Sp, t.SessionAccessor, root);
            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.AttachAsync(FileKind.ContractFile, "", big));
            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.AttachAsync(FileKind.ContractFile, "m1", big));
            Assert.False(Directory.Exists(root) && Directory.GetFiles(root, "*", SearchOption.AllDirectories).Length > 0);
        }
        finally
        {
            File.Delete(big);
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }
}
