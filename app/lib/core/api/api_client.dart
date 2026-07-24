import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import 'token_store.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override
  String toString() => message;
}

const String _configuredBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');

String _defaultBaseUrl() {
  if (_configuredBaseUrl.isNotEmpty) return _configuredBaseUrl;
  // Android emulators reach the host machine's localhost via the special alias 10.0.2.2, never
  // "localhost" (that resolves to the emulator itself). Override any of this with
  // `flutter run --dart-define=API_BASE_URL=http://<lan-ip>:4000/api/v1` for a physical device.
  if (!kIsWeb && Platform.isAndroid) return 'http://10.0.2.2:4000/api/v1';
  return 'http://localhost:4000/api/v1';
}

// Without this, a stalled connection (a common real-world Wi-Fi symptom — the request never
// gets a response and never gets reset either) leaves a request hanging forever with no way for
// the UI to know it should give up and let the user retry. Generous because a real phone photo
// over real Wi-Fi can legitimately take a while, but bounded so "stuck" is always eventually
// distinguishable from "still working."
const _requestTimeout = Duration(seconds: 30);
// Photo uploads are larger and slower than a plain JSON request, so they get more room before
// being declared stuck.
const _uploadTimeout = Duration(seconds: 60);

class ApiClient {
  final TokenStore tokenStore;
  final String baseUrl;
  final http.Client _http;

  // Refresh tokens rotate server-side (token.service.ts's rotate(): each use revokes the
  // presented token and issues a fresh pair). The home screen fires several requests at once on
  // load (branding, assignments, attendance) — if more than one hits a 401 around the same
  // moment, each would otherwise read the same soon-to-be-stale refresh token and race
  // independently to call it: whichever loses presents an already-used token, fails, and clears
  // the token store — wiping out the winner's just-issued valid pair and silently signing the
  // user out (exactly the race found and fixed on the web admin, A-064). This shared in-flight
  // future makes every concurrent 401 await the same single refresh attempt instead.
  Future<bool>? _refreshInFlight;

  ApiClient({required this.tokenStore, String? baseUrl, http.Client? client})
      : baseUrl = baseUrl ?? _defaultBaseUrl(),
        _http = client ?? http.Client();

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool auth = true,
    bool retry = true,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final token = await tokenStore.accessToken;
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }

    http.Response res;
    final encodedBody = body != null ? jsonEncode(body) : null;
    switch (method) {
      case 'GET':
        res = await _http.get(uri, headers: headers).timeout(_requestTimeout);
        break;
      case 'POST':
        res = await _http.post(uri, headers: headers, body: encodedBody).timeout(_requestTimeout);
        break;
      default:
        throw UnsupportedError('Unsupported method $method');
    }

    if (res.statusCode == 401 && auth && retry) {
      final refreshed = await _tryRefresh();
      if (refreshed) return _request(method, path, body: body, auth: auth, retry: false);
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return null;
      return jsonDecode(res.body);
    }

    String message = 'Request failed (${res.statusCode})';
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map && decoded['message'] != null) message = decoded['message'].toString();
    } catch (_) {
      // Non-JSON error body — keep the generic message.
    }
    throw ApiException(res.statusCode, message);
  }

  Future<bool> _tryRefresh() {
    return _refreshInFlight ??= _doRefresh().whenComplete(() => _refreshInFlight = null);
  }

  Future<bool> _doRefresh() async {
    final refresh = await tokenStore.refreshToken;
    if (refresh == null) return false;
    try {
      final res = await _http
          .post(
            Uri.parse('$baseUrl/auth/refresh'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'refreshToken': refresh}),
          )
          .timeout(_requestTimeout);
      if (res.statusCode != 200) {
        await tokenStore.clear();
        return false;
      }
      final decoded = jsonDecode(res.body) as Map<String, dynamic>;
      await tokenStore.save(
        accessToken: decoded['accessToken'] as String,
        refreshToken: decoded['refreshToken'] as String,
      );
      return true;
    } catch (_) {
      await tokenStore.clear();
      return false;
    }
  }

  Future<dynamic> get(String path) => _request('GET', path);
  Future<dynamic> postPublic(String path, Map<String, dynamic> body) =>
      _request('POST', path, body: body, auth: false);
  Future<dynamic> post(String path, Map<String, dynamic> body) => _request('POST', path, body: body);

  /// A raw-bytes GET (map tiles, so far) — same host resolution and bearer-token auth as every
  /// JSON call, just skipping the JSON decode step.
  Future<List<int>> getBytes(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{};
    final token = await tokenStore.accessToken;
    if (token != null) headers['Authorization'] = 'Bearer $token';
    final res = await _http.get(uri, headers: headers).timeout(_requestTimeout);
    if (res.statusCode >= 200 && res.statusCode < 300) return res.bodyBytes;
    throw ApiException(res.statusCode, 'Request failed (${res.statusCode})');
  }

  /// Multipart upload — used only for camera evidence photos. Field values are sent as form
  /// fields alongside the file, matching the backend's UploadMediaDto (multer + class-transformer
  /// coerce everything from strings, same as any HTML multipart form).
  Future<dynamic> postMultipart(
    String path, {
    required List<int> fileBytes,
    required String fileFieldName,
    required String fileName,
    required String mimeType,
    required Map<String, String> fields,
    bool retry = true,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final request = http.MultipartRequest('POST', uri);
    final token = await tokenStore.accessToken;
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.fields.addAll(fields);
    final parts = mimeType.split('/');
    request.files.add(
      http.MultipartFile.fromBytes(
        fileFieldName,
        fileBytes,
        filename: fileName,
        contentType: parts.length == 2 ? MediaType(parts[0], parts[1]) : null,
      ),
    );

    final streamed = await _http.send(request).timeout(_uploadTimeout);
    final res = await http.Response.fromStream(streamed).timeout(_uploadTimeout);

    if (res.statusCode == 401 && retry) {
      final refreshed = await _tryRefresh();
      if (refreshed) {
        return postMultipart(
          path,
          fileBytes: fileBytes,
          fileFieldName: fileFieldName,
          fileName: fileName,
          mimeType: mimeType,
          fields: fields,
          retry: false,
        );
      }
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return null;
      return jsonDecode(res.body);
    }
    String message = 'Upload failed (${res.statusCode})';
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map && decoded['message'] != null) message = decoded['message'].toString();
    } catch (_) {
      // Non-JSON error body — keep the generic message.
    }
    throw ApiException(res.statusCode, message);
  }
}
