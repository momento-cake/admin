# Mobile Platform Bug Debugging

## Mobile Debugging Tools
- Flutter console (runtime errors and warnings)
- Flutter DevTools (widget inspector, performance profiler)
- Actual devices (test beyond emulators)
- Xcode/Android Studio debuggers
- Offline mode testing (local storage and sync)
- Memory profiler (detect memory leaks)
- Network inspector (API calls)

## Steps to Reproduce (Mobile)

### Environment Setup
<Describe the mobile environment setup required>

### Reproduction Steps
1. Open screen: `<Screen name>`
2. Perform action: <Tap, swipe, input, etc.>
3. Observe: <What happens>

**Expected Result:** <What should happen>
**Actual Result:** <What actually happens>
**Error Log:** <Flutter console error if any>

### Reproduction Frequency
- [ ] Always (100%)
- [ ] Often (>50%)
- [ ] Sometimes (10-50%)
- [ ] Rare (<10%)

## Mobile Environment Details
- **Device**: <model and manufacturer>
- **OS Version**: iOS <version> | Android <version>
- **Flutter version**: <version>
- **Dart version**: <version>
- **App version**: <version>
- **Build flavor**: dev | prod
- **Network condition**: WiFi | 4G | 5G | Offline

## Relevant Mobile Files

### Files to Modify
- `lib/features/<feature>/<screen>_screen.dart:<line>` - <Why this file needs modification>
- `lib/features/<feature>/<screen>_viewmodel.dart:<line>` - <Why this file needs modification>
- `lib/providers/<provider>.dart:<line>` - <Why this file needs modification>
- `lib/models/<model>.dart:<line>` - <Data model modification>

### Files to Reference (Patterns)
- <List files with similar patterns to follow for the fix>

### New Files (if any)
- <List new files needed, with purpose>

## Mobile Fix Implementation Tasks

### Task 1: Reproduce Bug Locally
- [ ] Set up mobile development environment
- [ ] Start backend API if needed
- [ ] Launch emulator/simulator or connect device
- [ ] Run app: `fvm flutter run --flavor dev`
- [ ] Navigate to affected screen
- [ ] Perform actions that trigger bug
- [ ] Confirm bug exists and matches reported behavior
- [ ] Save error logs and screenshots as evidence

### Task 2: Verify Root Cause
- [ ] Check Flutter console for errors/warnings
- [ ] Add print/log statements to suspected code
- [ ] Use Flutter DevTools to inspect widget tree
- [ ] Check Riverpod provider state with DevTools
- [ ] Inspect local storage (Hive/Drift) for data issues
- [ ] Test on both iOS and Android if platform-specific
- [ ] Test offline mode if sync-related bug
- [ ] Document confirmation of root cause

### Task 3: Write Failing Test
- [ ] Create widget test that reproduces bug
- [ ] Create ViewModel unit test if state management affected
- [ ] Test should fail with current code
- [ ] Add assertions for expected vs actual behavior
- [ ] Run test to confirm it fails: `fvm flutter test <test_file>.dart`

### Task 4: Implement Minimal Mobile Fix
- [ ] Modify only the identified problematic screen/ViewModel
- [ ] Add error handling or state validation as needed
- [ ] Fix offline data sync if local storage issue
- [ ] Update navigation logic if routing bug
- [ ] Fix platform-specific code (iOS/Android) if applicable
- [ ] DO NOT refactor unrelated widgets
- [ ] DO NOT add new features
- [ ] Verify fix addresses root cause

### Task 5: Verify Test Now Passes
- [ ] Run the previously failing test
- [ ] Confirm test now passes
- [ ] Add edge case tests if needed
- [ ] Run full test suite: `fvm flutter test`
- [ ] Fix any regressions

### Task 6: Manual Mobile Verification
- [ ] Run app on emulator: `fvm flutter run --flavor dev`
- [ ] Reproduce original bug scenario
- [ ] Confirm bug no longer occurs
- [ ] Test on actual iOS device (if iOS-related)
- [ ] Test on actual Android device (if Android-related)
- [ ] Test in offline mode (airplane mode)
- [ ] Test data sync when going back online
- [ ] Verify error messages are user-friendly
- [ ] Check app performance (no lag, smooth animations)
- [ ] Test related features for regressions
- [ ] Verify UI follows design system

## Mobile Testing Strategy

### Unit Tests
- ViewModel business logic
- Provider state management
- Data model serialization/validation
- Service layer functions
- Utility functions

### Widget Tests
- Screen rendering
- User interactions (taps, swipes, inputs)
- Navigation flows
- Error and loading states
- Form validation
- Offline mode UI

### Integration Tests
- API client integration
- Local storage operations (Hive/Drift)
- Platform channel communication (iOS/Android native)
- Authentication flows
- Data synchronization

### Edge Cases to Test
- [ ] Empty/null data
- [ ] Invalid input formats
- [ ] Network failures (offline, timeout, slow connection)
- [ ] Large data sets (pagination, performance)
- [ ] Rapid user actions (tap spamming)
- [ ] Background/foreground transitions
- [ ] Low battery mode
- [ ] Low memory conditions
- [ ] Different screen sizes (small phone, tablet)
- [ ] Different OS versions
- [ ] Device rotation (portrait/landscape)

## Mobile Validation Commands

```bash
# Navigate to mobile
cd gangoapp

# Get Flutter dependencies
fvm flutter pub get

# Analyze Dart code
fvm flutter analyze

# Run specific test for this bug
fvm flutter test test/<test_file>.dart

# Run unit tests
fvm flutter test test/unit/

# Run widget tests
fvm flutter test test/widgets/

# Build for Android (dev flavor)
fvm flutter build apk --debug --flavor dev

# Build for iOS (dev flavor, macOS only)
fvm flutter build ios --debug --flavor dev --no-codesign

# Run on emulator/device for manual testing
fvm flutter run --flavor dev
```

## Mobile Manual Testing Checklist
- [ ] Reproduce original bug scenario - verify it's fixed
- [ ] Test on iOS simulator/device
- [ ] Test on Android emulator/device
- [ ] Test with different screen sizes (phone, tablet)
- [ ] Test device rotation (portrait/landscape)
- [ ] Test in offline mode (airplane mode)
- [ ] Test data sync when reconnecting
- [ ] Verify error messages are user-friendly
- [ ] Test app performance (smooth scrolling, animations)
- [ ] Check memory usage (no leaks)
- [ ] Test background/foreground transitions
- [ ] Verify navigation flows work correctly
- [ ] Test push notifications (if related)
- [ ] Verify UI follows design system
- [ ] Test accessibility features (VoiceOver, TalkBack)
