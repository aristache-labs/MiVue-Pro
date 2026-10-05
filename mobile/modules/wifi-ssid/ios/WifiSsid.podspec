Pod::Spec.new do |s|
  s.name           = 'WifiSsid'
  s.version        = '0.1.0'
  s.summary        = 'Read current Wi-Fi SSID for Laneory camera connection display'
  s.description    = 'Uses NEHotspotNetwork.fetchCurrent; never reads Wi-Fi passwords'
  s.license        = 'MIT'
  s.author         = 'Laneory'
  s.homepage       = 'https://example.invalid'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'NetworkExtension', 'CoreLocation'
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
