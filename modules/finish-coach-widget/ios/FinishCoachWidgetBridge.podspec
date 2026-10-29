Pod::Spec.new do |s|
  s.name = 'FinishCoachWidgetBridge'
  s.version = '1.0.0'
  s.summary = 'Atomic shared timeline for the Finish Coach widget'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'Finish Coach'
  s.homepage = 'https://github.com/asher2red/FinishCoach'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/asher2red/FinishCoach.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
