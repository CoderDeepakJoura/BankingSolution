using BankingPlatform.API.Controllers.Member;
using BankingPlatform.Infrastructure.Models.member;

namespace BankingPlatform.API.Service
{
    public class ImageService
    {
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;
        private readonly DocPaths _docPaths;

        public ImageService(IWebHostEnvironment environment, IConfiguration configuration, IOptions<DocPaths> docPaths)
        {
            _environment = environment;
            _configuration = configuration;
            _docPaths = docPaths.Value;
        }

        public async Task<(string fileName, string extension)> SaveImageAsync(
            IFormFile file,
            int memberId,
            string imageType,
            string masterFolderName,
            string subFolderName = "")
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File is empty");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
                throw new ArgumentException("Invalid file type. Only JPG, PNG, GIF allowed.");

            // ✅ Validate file size (max 5MB)
            if (file.Length > 5 * 1024 * 1024)
                throw new ArgumentException("File size cannot exceed 5MB");

            var fileName = $"member_{memberId}_{imageType}{extension}";

            // ✅ Create directory path
            var uploadsFolder = Path.Combine(_docPaths.MemberImagesDrive, masterFolderName);
            if (subFolderName != "")
                uploadsFolder = Path.Combine(uploadsFolder, subFolderName);
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var filePath = Path.Combine(uploadsFolder, fileName);

            // ✅ Save file
            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return (fileName, extension);
        }

        public bool DeleteImage(int memberId, string imageType, string extension, string masterFolderName, string? subFolderName = "")
        {
            try
            {
                var fileName = $"member_{memberId}_{imageType}{extension}";

                // ✅ Create directory path
                var filePath = Path.Combine(_docPaths.MemberImagesDrive, masterFolderName);
                if (subFolderName != "")
                    filePath = Path.Combine(filePath, subFolderName!,fileName );
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    return true;
                }
                return false;
            }
            catch
            {
                return false;
            }
        }

        public (byte[] fileBytes, string contentType)? GetImageFile(string fileName, string masterFolderName, string? subFolderName = "")
        {
            if (string.IsNullOrEmpty(fileName))
                return null;

            var folderPath = Path.Combine(_docPaths.MemberImagesDrive, masterFolderName);
            if (!string.IsNullOrEmpty(subFolderName))
                folderPath = Path.Combine(folderPath, subFolderName);

            var filePath = Path.Combine(folderPath, fileName);

            if (!File.Exists(filePath))
                return null;

            var ext = Path.GetExtension(filePath).ToLowerInvariant();
            var contentType = ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                _ => "application/octet-stream"
            };

            var fileBytes = File.ReadAllBytes(filePath);
            return (fileBytes, contentType);
        }

        public async Task<(string fileName, string extension)> SaveAccountImageAsync(
            IFormFile file,
            int accountId,
            string imageType,
            string masterFolderName,
            string subFolderName = "")
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File is empty");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
                throw new ArgumentException("Invalid file type. Only JPG, PNG, GIF allowed.");

            // ✅ Validate file size (max 5MB)
            if (file.Length > 5 * 1024 * 1024)
                throw new ArgumentException("File size cannot exceed 5MB");

            var fileName = $"account_{accountId}_{imageType}{extension}";

            // ✅ Create directory path
            var uploadsFolder = Path.Combine(_docPaths.AccountImagesDrive, masterFolderName);
            if (subFolderName != "")
                uploadsFolder = Path.Combine(uploadsFolder, subFolderName);
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var filePath = Path.Combine(uploadsFolder, fileName);

            // ✅ Save file
            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return (fileName, extension);
        }

        public bool DeleteAccountImage(int accountId, string imageType, string extension, string masterFolderName, string? subFolderName = "")
        {
            try
            {
                var fileName = $"account_{accountId}_{imageType}{extension}";

                // ✅ Create directory path
                var filePath = Path.Combine(_docPaths.AccountImagesDrive, masterFolderName);
                if (subFolderName != "")
                    filePath = Path.Combine(filePath, subFolderName!, fileName);
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    return true;
                }
                return false;
            }
            catch
            {
                return false;
            }
        }



    }

}
