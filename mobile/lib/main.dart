import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'theme.dart';
import 'screens/login_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  if (!kIsWeb) {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Color(0xFFF1F5F9),
      systemNavigationBarIconBrightness: Brightness.dark,
    ));
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  }
  runApp(const SICSWaveApp());
}

class SICSWaveApp extends StatelessWidget {
  const SICSWaveApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sicswave Fincore',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: const LoginScreen(),
      builder: (context, child) {
        if (kIsWeb) {
          return Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: child!,
            ),
          );
        }
        return child!;
      },
    );
  }
}
