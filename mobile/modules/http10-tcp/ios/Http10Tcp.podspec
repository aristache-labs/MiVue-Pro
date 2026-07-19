Pod::Spec.new do |s|
  s.name           = 'Http10Tcp'
  s.version        = '0.1.0'
  s.summary        = 'HTTP/1.0 TCP transport for local dashcam access'
  s.description    = 'Read-only HTTP/1.0 over raw TCP for camera interoperability'
  s.license        = 'MIT'
  s.author         = 'Laneory'
  s.homepage       = 'https://example.invalid'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
