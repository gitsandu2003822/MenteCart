import '../services/api_service.dart';

class ServiceRepository {
  Future<List<Map<String, dynamic>>> fetchServices() async {
    final resp = await ApiService.getServices();
    return (resp['data'] as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> fetchServicesPage(
      {int page = 1, int limit = 10, String? search, String? category}) async {
    final resp = await ApiService.getServices(
        page: page, limit: limit, search: search, category: category);
    return resp;
  }
}
