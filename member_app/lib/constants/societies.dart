class Society {
  final String name;
  final String baseUrl;
  const Society({required this.name, required this.baseUrl});
}

// ── Update these URLs to match your server configuration ──────────────────
const List<Society> kSocieties = [
  Society(
    name: 'Hindu Thrift & Credit Society',
    baseUrl: 'https://api.yourdomain.com/hindu/api',
  ),
  Society(
    name: 'Krishna Thrift & Credit Society',
    baseUrl: 'https://api.yourdomain.com/krishna/api',
  ),
];
