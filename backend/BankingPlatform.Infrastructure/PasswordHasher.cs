using System.Security.Cryptography;
using System.Text;

public static class PasswordHasher
{
    public static string HashPassword(string password)
    {
        // Generate a salt
        byte[] salt = RandomNumberGenerator.GetBytes(16); // 128-bit salt

        // Derive the key
        var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 100_000, HashAlgorithmName.SHA256);
        byte[] hash = pbkdf2.GetBytes(32); // 256-bit hash

        // Combine salt + hash
        byte[] hashBytes = new byte[48]; // 16 + 32
        Buffer.BlockCopy(salt, 0, hashBytes, 0, 16);
        Buffer.BlockCopy(hash, 0, hashBytes, 16, 32);

        // Return as Base64
        return Convert.ToBase64String(hashBytes);
    }

    public static bool VerifyPassword(string password, string storedHash)
    {
        try
        {
            byte[] hashBytes = Convert.FromBase64String(storedHash);
            if (hashBytes.Length != 48) return false;

            byte[] salt = new byte[16];
            Buffer.BlockCopy(hashBytes, 0, salt, 0, 16);

            var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 100_000, HashAlgorithmName.SHA256);
            byte[] hash = pbkdf2.GetBytes(32);

            var expected = new byte[32];
            Buffer.BlockCopy(hashBytes, 16, expected, 0, 32);
            return CryptographicOperations.FixedTimeEquals(hash, expected);
        }
        catch
        {
            return false;
        }
    }
}
