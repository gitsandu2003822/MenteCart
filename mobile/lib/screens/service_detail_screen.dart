import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../bloc/cart_bloc.dart';

class ServiceDetailScreen extends StatefulWidget {
  final Map<String, dynamic> service;

  const ServiceDetailScreen({required this.service, super.key});

  @override
  State<ServiceDetailScreen> createState() => _ServiceDetailScreenState();
}

class _ServiceDetailScreenState extends State<ServiceDetailScreen> {
  late DateTime _selectedDate;
  String? _selectedSlot;
  int _quantity = 1;

  final List<String> _timeSlots = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
  ];

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now();
  }

  void _addToCart() {
    if (_selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a time slot')),
      );
      return;
    }

    final dateStr = '${_selectedDate.year.toString().padLeft(4, '0')}-'
        '${_selectedDate.month.toString().padLeft(2, '0')}-'
        '${_selectedDate.day.toString().padLeft(2, '0')}';
    context.read<CartBloc>().add(
          CartItemAdded(
            widget.service['_id'].toString(),
            dateStr,
            _selectedSlot!,
            quantity: _quantity,
          ),
        );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Added to cart')),
    );

    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.service['title'] ?? 'Service')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Service Info
            Text(
              widget.service['title'] ?? 'Service',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              widget.service['description'] ?? 'No description',
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Price:',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('Rs ${widget.service['price']}',
                        style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.green)),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Duration:',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('${widget.service['duration'] ?? 60} mins'),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Date Picker
            const Text('Select Date:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 30)),
                );
                if (picked != null) {
                  setState(() => _selectedDate = picked);
                }
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${_selectedDate.year.toString().padLeft(4, '0')}-'
                  '${_selectedDate.month.toString().padLeft(2, '0')}-'
                  '${_selectedDate.day.toString().padLeft(2, '0')}',
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Time Slot Picker
            const Text('Select Time Slot:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
              ),
              itemCount: _timeSlots.length,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemBuilder: (context, index) {
                final slot = _timeSlots[index];
                final isSelected = _selectedSlot == slot;
                return GestureDetector(
                  onTap: () => setState(() => _selectedSlot = slot),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected ? Colors.blue : Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected ? Colors.blue : Colors.transparent,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        slot,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.black,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),

            // Quantity Selector
            const Text('Quantity:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton(
                  onPressed: () =>
                      setState(() => _quantity = (_quantity - 1).clamp(1, 10)),
                  icon: const Icon(Icons.remove),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  decoration: BoxDecoration(border: Border.all()),
                  child: Text('$_quantity'),
                ),
                IconButton(
                  onPressed: () =>
                      setState(() => _quantity = (_quantity + 1).clamp(1, 10)),
                  icon: const Icon(Icons.add),
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Add to Cart Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _addToCart,
                child: const Text('Add to Cart'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
