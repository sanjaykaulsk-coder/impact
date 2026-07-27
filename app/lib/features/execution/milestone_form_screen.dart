import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/providers.dart';
import '../../l10n/app_localizations.dart';
import 'execution_models.dart';

/// Stage 3.1 renderer: covers the full field-type palette the web builder can produce, including
/// the archetype presets' SKU-bound quantity/value fields and live auto-calculated totals.
/// Media/signature capture stays with the dedicated evidence flow (camera-only, watermarked) —
/// those types render an explanatory note rather than a second, weaker capture path.
class MilestoneFormScreen extends ConsumerStatefulWidget {
  final String activityInstanceId;
  final String campaignId;
  final Milestone milestone;
  const MilestoneFormScreen({
    super.key,
    required this.activityInstanceId,
    required this.campaignId,
    required this.milestone,
  });

  @override
  ConsumerState<MilestoneFormScreen> createState() => _MilestoneFormScreenState();
}

class _MilestoneFormScreenState extends ConsumerState<MilestoneFormScreen> {
  final Map<String, dynamic> _values = {};
  bool _submitting = false;
  String? _error;

  List<FormQuestion> get _allQuestions =>
      (widget.milestone.formVersion?.sections ?? const []).expand((s) => s.questions).toList();

  bool _isVisible(FormQuestion question) {
    final rules = widget.milestone.formVersion?.conditionalRules ?? const [];
    final targeting = rules.where((r) => r.targetQuestionId == question.id);
    if (targeting.isEmpty) return true;
    for (final rule in targeting) {
      final triggerValue = _values[rule.triggerQuestionId];
      final matches = triggerValue == rule.triggerValueJson;
      if (rule.action == 'SHOW') return matches;
      if (rule.action == 'HIDE') return !matches;
    }
    return true;
  }

  /// Live client-side preview of an AUTO_CALCULATED total: sums the current answers of SKU-bound
  /// questions matching the formula's movement type and metric. Mirrors the server's rollup
  /// (which recomputes from stored movements at report time — the stored record never contains a
  /// typed total, report-format-library §2). Only the plain single-function formulas the presets
  /// generate are previewed; anything more complex shows "computed at report time".
  num? _computedValue(FormQuestion question) {
    final formula = question.formulaExpression?.trim() ?? '';
    final match = RegExp(r'^(SKU_QTY_TOTAL|SKU_AMOUNT_TOTAL)\((\w+)\)$').firstMatch(formula);
    if (match == null) return null;
    final metric = match.group(1) == 'SKU_QTY_TOTAL' ? 'QUANTITY' : 'AMOUNT';
    final movementType = match.group(2);
    num total = 0;
    for (final q in _allQuestions) {
      final binding = q.skuBinding;
      if (binding == null) continue;
      if (binding['movementType'] != movementType || binding['metric'] != metric) continue;
      final v = _values[q.id];
      if (v is num) total += v;
    }
    return total;
  }

  String? _rangeViolation(AppLocalizations t, FormQuestion question, dynamic value) {
    if (value is! num) return null;
    final min = question.controlsJson['min'];
    final max = question.controlsJson['max'];
    if (min is num && value < min) return t.minimumIs(question.label, min);
    if (max is num && value > max) return t.maximumIs(question.label, max);
    return null;
  }

  Future<void> _submit() async {
    final t = AppLocalizations.of(context)!;
    final visibleQuestions = _allQuestions.where(_isVisible).toList();

    final missing = visibleQuestions.where((q) => q.isMandatory && _values[q.id] == null).toList();
    if (missing.isNotEmpty) {
      setState(() => _error = t.pleaseAnswerFields(missing.map((q) => q.label).join(', ')));
      return;
    }
    final violations = visibleQuestions
        .map((q) => _rangeViolation(t, q, _values[q.id]))
        .whereType<String>()
        .toList();
    if (violations.isNotEmpty) {
      setState(() => _error = violations.join('\n'));
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final deviceId = await ref.read(tokenStoreProvider).serverDeviceId;
      final fieldResponses = visibleQuestions
          .where((q) => _values[q.id] != null)
          .map((q) => {'formQuestionId': q.id, 'valueJson': _values[q.id]})
          .toList();

      await ref.read(outboxDatabaseProvider).enqueue(
        type: 'milestoneResponse',
        campaignId: widget.campaignId,
        activityInstanceId: widget.activityInstanceId,
        payload: {
          'clientRef': const Uuid().v4(),
          'deviceId': ?deviceId,
          'fieldResponses': fieldResponses,
        },
      );
      try {
        await ref.read(syncServiceProvider).syncPending(force: true);
      } catch (_) {
        // Queued regardless — will retry on the next sync trigger.
      }
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sections = widget.milestone.formVersion?.sections ?? const [];
    return Scaffold(
      appBar: AppBar(title: Text(widget.milestone.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          for (final section in sections) ...[
            Text(section.title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            for (final question in section.questions.where(_isVisible))
              _QuestionField(
                question: question,
                value: _values[question.id],
                computedValue: question.fieldType == 'AUTO_CALCULATED' ? _computedValue(question) : null,
                onChanged: (v) => setState(() => _values[question.id] = v),
              ),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting ? const CircularProgressIndicator() : Text(AppLocalizations.of(context)!.submit),
          ),
        ],
      ),
    );
  }
}

class _QuestionField extends StatefulWidget {
  final FormQuestion question;
  final dynamic value;
  final num? computedValue;
  final ValueChanged<dynamic> onChanged;
  const _QuestionField({
    required this.question,
    required this.value,
    required this.onChanged,
    this.computedValue,
  });

  @override
  State<_QuestionField> createState() => _QuestionFieldState();
}

class _QuestionFieldState extends State<_QuestionField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value?.toString() ?? '');
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String get _label => widget.question.isMandatory ? '${widget.question.label} *' : widget.question.label;

  Widget _pad(Widget child) => Padding(padding: const EdgeInsets.only(bottom: 12), child: child);

  Widget _textInput({int maxLines = 1}) {
    final maxLength = widget.question.controlsJson['maxLength'];
    return _pad(TextField(
      controller: _controller,
      maxLines: maxLines,
      maxLength: maxLength is num ? maxLength.toInt() : null,
      decoration: InputDecoration(
        labelText: _label,
        helperText: widget.question.helpText,
        border: const OutlineInputBorder(),
      ),
      onChanged: widget.onChanged,
    ));
  }

  Widget _numberInput({required bool decimal}) {
    return _pad(TextField(
      controller: _controller,
      keyboardType: decimal ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.number,
      decoration: InputDecoration(
        labelText: _label,
        helperText: widget.question.helpText,
        border: const OutlineInputBorder(),
      ),
      onChanged: (v) => widget.onChanged(decimal ? double.tryParse(v) : int.tryParse(v)),
    ));
  }

  Widget _note(String text) => _pad(Text(text, style: TextStyle(color: Colors.grey.shade600, fontStyle: FontStyle.italic)));

  /// A compact identity block (name / mobile / address) stored as one map answer — the schema's
  /// RETAILER_DETAILS and CONSUMER_DETAILS composite types.
  Widget _identityBlock() {
    final current = (widget.value as Map<String, dynamic>?) ?? const {};
    void update(String field, String v) {
      final next = Map<String, dynamic>.from(current);
      if (v.isEmpty) {
        next.remove(field);
      } else {
        next[field] = v;
      }
      widget.onChanged(next.isEmpty ? null : next);
    }

    final t = AppLocalizations.of(context)!;
    return _pad(Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(_label, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 8),
        TextField(
          decoration: InputDecoration(labelText: t.nameLabel, border: const OutlineInputBorder()),
          onChanged: (v) => update('name', v),
        ),
        const SizedBox(height: 8),
        TextField(
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(labelText: t.mobileLabel, border: const OutlineInputBorder()),
          onChanged: (v) => update('mobile', v),
        ),
        const SizedBox(height: 8),
        TextField(
          decoration: InputDecoration(labelText: t.addressLandmarkLabel, border: const OutlineInputBorder()),
          onChanged: (v) => update('address', v),
        ),
      ],
    ));
  }

  Widget _multiChoice() {
    final selected = (widget.value as List<dynamic>?)?.cast<String>() ?? const <String>[];
    return _pad(Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(_label, style: Theme.of(context).textTheme.bodyMedium),
        for (final option in widget.question.options)
          CheckboxListTile(
            title: Text(option.label),
            value: selected.contains(option.value),
            onChanged: (checked) {
              final next = List<String>.from(selected);
              if (checked == true) {
                next.add(option.value);
              } else {
                next.remove(option.value);
              }
              widget.onChanged(next.isEmpty ? null : next);
            },
          ),
      ],
    ));
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    switch (widget.question.fieldType) {
      case 'SHORT_TEXT':
        return _textInput();
      case 'LONG_TEXT':
      case 'REMARKS':
        return _textInput(maxLines: 3);
      case 'INTEGER':
        return _numberInput(decimal: false);
      case 'DECIMAL':
      case 'CURRENCY':
      case 'PERCENTAGE':
      case 'MEASUREMENT':
      case 'QUANTITY':
      case 'SALES_VALUE':
      case 'STOCK_VALUE':
        return _numberInput(decimal: true);
      case 'DATE':
        return _pad(InputDecorator(
          decoration: InputDecoration(labelText: _label, border: const OutlineInputBorder()),
          child: InkWell(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: DateTime.now(),
                firstDate: DateTime(2020),
                lastDate: DateTime(2100),
              );
              if (picked != null) {
                final iso = picked.toIso8601String().substring(0, 10);
                setState(() => _controller.text = iso);
                widget.onChanged(iso);
              }
            },
            child: Text(_controller.text.isEmpty ? t.selectADate : _controller.text),
          ),
        ));
      case 'TIME':
        return _pad(InputDecorator(
          decoration: InputDecoration(labelText: _label, border: const OutlineInputBorder()),
          child: InkWell(
            onTap: () async {
              final picked = await showTimePicker(context: context, initialTime: TimeOfDay.now());
              if (picked != null && context.mounted) {
                final text =
                    '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
                setState(() => _controller.text = text);
                widget.onChanged(text);
              }
            },
            child: Text(_controller.text.isEmpty ? t.selectATime : _controller.text),
          ),
        ));
      case 'DATETIME':
        return _pad(InputDecorator(
          decoration: InputDecoration(labelText: _label, border: const OutlineInputBorder()),
          child: InkWell(
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                initialDate: DateTime.now(),
                firstDate: DateTime(2020),
                lastDate: DateTime(2100),
              );
              if (date == null || !context.mounted) return;
              final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
              final combined = DateTime(
                date.year,
                date.month,
                date.day,
                time?.hour ?? 0,
                time?.minute ?? 0,
              );
              final iso = combined.toIso8601String();
              setState(() => _controller.text = iso.substring(0, 16).replaceFirst('T', ' '));
              widget.onChanged(iso);
            },
            child: Text(_controller.text.isEmpty ? t.selectDateTime : _controller.text),
          ),
        ));
      case 'DROPDOWN':
        return _pad(DropdownButtonFormField<String>(
          initialValue: widget.value as String?,
          decoration: InputDecoration(labelText: _label, border: const OutlineInputBorder()),
          items: widget.question.options
              .map((o) => DropdownMenuItem(value: o.value, child: Text(o.label)))
              .toList(),
          onChanged: widget.onChanged,
        ));
      case 'RADIO':
        return _pad(Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_label, style: Theme.of(context).textTheme.bodyMedium),
            RadioGroup<String>(
              groupValue: widget.value as String?,
              onChanged: widget.onChanged,
              child: Column(
                children: [
                  for (final option in widget.question.options)
                    RadioListTile<String>(title: Text(option.label), value: option.value),
                ],
              ),
            ),
          ],
        ));
      case 'MULTI_SELECT':
      case 'CHECKBOX':
        return _multiChoice();
      case 'YES_NO':
        return _pad(SwitchListTile(
          title: Text(_label),
          value: widget.value == true,
          onChanged: widget.onChanged,
        ));
      case 'RATING':
        final rating = (widget.value as num?)?.toInt() ?? 0;
        return _pad(Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_label, style: Theme.of(context).textTheme.bodyMedium),
            Row(
              children: [
                for (var i = 1; i <= 5; i++)
                  IconButton(
                    icon: Icon(i <= rating ? Icons.star : Icons.star_border, color: Colors.amber),
                    onPressed: () => widget.onChanged(i),
                  ),
              ],
            ),
          ],
        ));
      case 'RETAILER_DETAILS':
      case 'CONSUMER_DETAILS':
        return _identityBlock();
      case 'AUTO_CALCULATED':
        return _pad(InputDecorator(
          decoration: InputDecoration(
            labelText: widget.question.label,
            border: const OutlineInputBorder(),
            helperText: t.calculatedAutomatically,
          ),
          child: Text(
            widget.computedValue != null ? widget.computedValue.toString() : t.computedAtReportTime,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ));
      case 'AUTO_TIMESTAMP':
      case 'AUTO_USER':
      case 'AUTO_ACTIVITY_ID':
      case 'AUTO_CAMPAIGN_ID':
      case 'AUTO_LOCATION':
        return _note(t.filledAutomaticallyOnServer(widget.question.label));
      case 'PHOTO':
      case 'MULTIPLE_PHOTOS':
      case 'GPS':
        return _note(t.capturedThroughEvidenceFlow(_label));
      case 'SHORT_VIDEO':
      case 'SIGNATURE':
      case 'DOCUMENT':
        return _note(t.captureArrivesLaterBuild(_label));
      default:
        return _note(t.unsupportedFieldType(_label, widget.question.fieldType));
    }
  }
}
