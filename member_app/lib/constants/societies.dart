class Society {
  final String name;
  final String baseUrl;
  const Society({required this.name, required this.baseUrl});
}

const List<Society> kSocieties = [
  Society(
    name: 'Hindu Thrift & Credit Society',
    baseUrl: 'https://api.sicswave.com/hindu/api',
  ),
  Society(
    name: 'Krishna Thrift & Credit Society',
    baseUrl: 'https://api.sicswave.com/krishna/api',
  ),
];
