# Generates a separate verification project; never edits the app's CNG project.
require 'xcodeproj'
require 'fileutils'
root = File.expand_path('..', __dir__)
out = ARGV.fetch(0)
FileUtils.mkdir_p(out)
FileUtils.cp(File.join(root, 'e2e/native/NavigationUITests.swift'), out)
project = Xcodeproj::Project.new(File.join(out, 'NavigationCheck.xcodeproj'))
target = project.new_target(:ui_test_bundle, 'NavigationUITests', :ios, '16.4')
target.add_file_references([project.main_group.new_file('NavigationUITests.swift')])
target.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.finishcoach.navigation.tests'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
  config.build_settings['TEST_TARGET_NAME'] = ''
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.add_test_target(target)
scheme.save_as(project.path, 'NavigationUITests', true)
puts project.path
