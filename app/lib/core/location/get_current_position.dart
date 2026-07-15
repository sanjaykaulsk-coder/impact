import 'package:geolocator/geolocator.dart';

/// Requests location permission (if not already granted) and returns the current position, or
/// throws a plain-language exception describing exactly why it couldn't — permission denied,
/// permanently denied (needs a Settings visit), or location services turned off. Shared by every
/// screen that needs GPS so they all fail the same, diagnosable way rather than each screen
/// re-implementing this (and, as happened once, silently swallowing the real reason).
Future<Position> getCurrentPositionOrThrow() async {
  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.deniedForever) {
    throw Exception('Location permission was denied. Enable it for this app in your phone\'s Settings.');
  }
  if (permission == LocationPermission.denied) {
    throw Exception('Location permission is required.');
  }
  if (!await Geolocator.isLocationServiceEnabled()) {
    throw Exception('Turn on location services to continue.');
  }
  return Geolocator.getCurrentPosition(
    locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
  );
}
