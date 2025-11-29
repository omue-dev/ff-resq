# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin "utils/message_animations", to: "utils/message_animations.js"
pin "utils/slide_animations", to: "utils/slide_animations.js"
pin "utils/distance_utils", to: "utils/distance_utils.js"
pin "utils/google_maps_utils", to: "utils/google_maps_utils.js"
pin "utils/distance_utils", to: "utils/distance_utils.js"
pin "utils/location_card_horizontal", to: "utils/location_card_horizontal.js"
pin "config/animation_constants", to: "config/animation_constants.js"
pin "config/google_maps_config", to: "config/google_maps_config.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "bootstrap", to: "bootstrap.min.js", preload: true
pin "@popperjs/core", to: "popper.js", preload: true
pin "gsap", to: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/+esm"
