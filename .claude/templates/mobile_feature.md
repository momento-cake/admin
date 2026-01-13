# Mobile Platform Architecture

## Screens
**Screens:**
- `<ScreenName>View` - <description and user flow>

## ViewModels
**ViewModels:**
- `<ScreenName>ViewModel` - <state management and business logic>

## Providers (Riverpod)
**Providers:**
- `<resourceName>Provider` - <provider type and purpose>
- `<resourceName>StateProvider` - <state management>

## Navigation
**Route:** `/<route_name>`
**Deep Linking:** <if applicable>
**Navigation Guards:** <authentication, authorization>

## Offline Support
**Local Cache Strategy:** <Hive/Drift storage approach>
**Sync Mechanism:** <when and how to sync with backend>
**Conflict Resolution:** <how to handle sync conflicts>

## Platform-Specific Features
**iOS-specific:**
- <iOS-specific considerations>

**Android-specific:**
- <Android-specific considerations>

**Permissions:**
- <required permissions>

## Relevant Mobile Files
- `lib/features/<feature>/<screen>_screen.dart` - <screen purpose>
- `lib/features/<feature>/<screen>_viewmodel.dart` - <viewmodel logic>
- `lib/providers/<provider>.dart` - <provider purpose>
- `lib/models/<model>.dart` - <data model>

## Mobile Implementation Tasks

### Data Models
- [ ] Create Dart model classes
- [ ] Add JSON serialization (json_serializable)
- [ ] Implement model validation
- [ ] Write model tests

### ViewModels
- [ ] Create ViewModels with Riverpod
- [ ] Implement state management
- [ ] Add business logic
- [ ] Handle loading/error states
- [ ] Write ViewModel unit tests

### Screen Widgets
- [ ] Create screen widget classes
- [ ] Implement UI with Flutter widgets
- [ ] Add navigation logic (GoRouter)
- [ ] Implement loading and error states
- [ ] Support light/dark themes
- [ ] Write widget tests

### Offline Support
- [ ] Implement local storage (Hive/Drift)
- [ ] Create sync mechanism with backend
- [ ] Handle offline mode gracefully
- [ ] Add background sync capability
- [ ] Test offline functionality thoroughly

### Platform-Specific Features
- [ ] Implement iOS-specific features (if any)
- [ ] Implement Android-specific features (if any)
- [ ] Handle platform permissions
- [ ] Test on both iOS and Android devices

## Mobile Testing Strategy

### Unit Tests
- ViewModel business logic
- Provider state management
- Data model serialization
- Validation rules

### Widget Tests
- Screen rendering
- User interactions
- Navigation flows
- Error and loading states

## Mobile Validation Commands

```bash
# Navigate to mobile directory
cd gangoapp

# Get Flutter dependencies
fvm flutter pub get

# Analyze Dart code
fvm flutter analyze

# Run unit tests
fvm flutter test test/unit/

# Run widget tests
fvm flutter test test/widgets/

# Build for Android (dev flavor)
fvm flutter build apk --debug --flavor dev

# Build for iOS (dev flavor, macOS only)
fvm flutter build ios --debug --flavor dev --no-codesign

# Run on device/emulator for manual testing
fvm flutter run --flavor dev
```
