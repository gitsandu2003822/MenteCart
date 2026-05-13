import 'package:flutter/material.dart';

void main() {
  runApp(const MenteCartApp());
}

class MenteCartApp extends StatelessWidget {
  const MenteCartApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'MenteCart',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("MenteCart"),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Services",
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),

            const SizedBox(height: 10),

            Expanded(
              child: ListView(
                children: const [
                  WireframeCard(title: "Home Cleaning"),
                  WireframeCard(title: "AC Repair"),
                  WireframeCard(title: "Plumbing Service"),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}

class WireframeCard extends StatelessWidget {
  final String title;

  const WireframeCard({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(title),
        subtitle: const Text("Tap to view details"),
        trailing: const Icon(Icons.arrow_forward_ios),
        onTap: () {},
      ),
    );
  }
}