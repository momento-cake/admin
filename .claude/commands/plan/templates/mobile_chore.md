# Mobile Platform Chore

## Mobile Files to Modify

- `pubspec.yaml` - <Why this file needs modification>
- `lib/<path>/<file>.dart` - <Why this file needs modification>
- `test/<path>/<test>.dart` - <Test updates needed>
- `ios/Podfile` - <iOS dependency changes>
- `android/app/build.gradle` - <Android dependency changes>
- `lib/config/<config>.dart` - <Configuration changes>

## Mobile Step by Step Tasks

### Task: Make Mobile Changes
- [ ] Update pubspec.yaml dependencies (if dependency update)
- [ ] Run `fvm flutter pub get` to fetch dependencies
- [ ] Run `fvm flutter pub outdated` to check versions
- [ ] Refactor mobile code (if refactoring)
- [ ] Update imports and references
- [ ] Fix Dart analyzer issues: `fvm flutter analyze`
- [ ] Update related unit tests
- [ ] Update widget tests
- [ ] Update integration tests
- [ ] Verify Riverpod providers still work
- [ ] Verify GoRouter navigation still works
- [ ] Test offline mode and data sync
- [ ] Update iOS Podfile if needed: `cd ios && pod install`
- [ ] Update Android gradle dependencies if needed
- [ ] Test on both iOS and Android
- [ ] Verify Firebase integration still works

## Mobile Testing Strategy

### Unit Tests
- ViewModel business logic
- Provider state management
- Data model serialization
- Service layer functions
- Utility functions

### Widget Tests
- Screen rendering
- User interactions
- Navigation flows
- Form validation
- Error and loading states
- Offline mode UI

### Integration Tests
- API client integration
- Local storage (Hive/Drift)
- Firebase integration
- Platform channel communication (iOS/Android native)
- Authentication flows
- Data synchronization

### Dependency Testing (for dependency updates)
- Verify Flutter SDK compatibility
- Check Riverpod version compatibility
- Test GoRouter navigation
- Verify Firebase SDK updates
- Test platform-specific packages (iOS/Android)

## Mobile Validation Commands

```bash
# Navigate to mobile
cd gangoapp

# Get dependencies
fvm flutter pub get

# Check for outdated packages
fvm flutter pub outdated

# Analyze Dart code
fvm flutter analyze

# Run unit tests
fvm flutter test test/unit/

# Run widget tests
fvm flutter test test/widgets/

# Run all tests
fvm flutter test

# Build for Android (dev flavor)
fvm flutter build apk --debug --flavor dev

# Build for iOS (dev flavor, macOS only)
fvm flutter build ios --debug --flavor dev --no-codesign

# Run on emulator/device for manual testing
fvm flutter run --flavor dev
```

## Mobile Manual Testing Checklist
- [ ] Verify Dart analyzer passes
- [ ] Run all mobile tests (unit + widget + integration)
- [ ] Test on iOS simulator/device
- [ ] Test on Android emulator/device
- [ ] Test different screen sizes (phone, tablet)
- [ ] Test device rotation (portrait/landscape)
- [ ] Test in offline mode (airplane mode)
- [ ] Test data sync when reconnecting
- [ ] Verify Firebase integration (auth, analytics, notifications)
- [ ] Test platform-specific features (iOS/Android)
- [ ] Check for memory leaks
- [ ] Verify app performance (smooth scrolling, animations)
- [ ] Test background/foreground transitions
- [ ] Verify push notifications work

## Mobile Best Practices

**Dependency Updates:**
- Update Flutter SDK cautiously
- Check pub.dev for breaking changes
- Update Riverpod and related packages together
- Test Firebase SDK compatibility
- Verify platform-specific package compatibility (iOS/Android)
- Run `pod install` after iOS dependency changes

**Refactoring:**
- Follow MVVM architecture pattern
- Use Riverpod for state management consistently
- Keep ViewModels focused and testable
- Extract reusable widgets
- Maintain type safety with Dart

**Configuration:**
- Update config_dev.json and config_prod.json
- Keep sensitive data in Firebase Remote Config
- Update both iOS and Android configurations
- Document configuration changes

**Performance:**
- Optimize image loading and caching
- Use lazy loading for lists
- Minimize main thread work
- Test memory usage
- Optimize offline data storage
- Profile app performance regularly

**Platform-Specific:**
- Test iOS and Android separately
- Update Podfile for iOS dependencies
- Update build.gradle for Android dependencies
- Test platform channels if native code affected
- Verify minimum OS version compatibility
