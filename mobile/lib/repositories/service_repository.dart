import '../services/api_service.dart';

class ServiceRepository {
  Future<List<Map<String, dynamic>>> fetchServices() async {
    final services = await ApiService.getServices();
    return services.cast<Map<String, dynamic>>();
  }
}
