import '../services/api_service.dart';

class CartRepository {
  Future<Map<String, dynamic>> fetchCart() async {
    return await ApiService.getCart();
  }

  Future<Map<String, dynamic>> addItem(
      String serviceId, String date, String timeSlot,
      {int quantity = 1}) async {
    return await ApiService.addToCart(serviceId, date, timeSlot,
        quantity: quantity);
  }

  Future<Map<String, dynamic>> updateItem(
    String itemId, {
    int? quantity,
    String? date,
    String? timeSlot,
  }) async {
    return await ApiService.updateCartItem(
      itemId,
      quantity: quantity,
      date: date,
      timeSlot: timeSlot,
    );
  }

  Future<Map<String, dynamic>> removeItem(String itemId) async {
    return await ApiService.removeCartItem(itemId);
  }
}
