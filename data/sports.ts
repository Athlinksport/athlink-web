export type SportOption = {
  id: string;
  name: string;
  category: string;
};

export const sports: SportOption[] = [
  // Team sports
  { id: "football", name: "Football / Soccer", category: "Team sports" },
  { id: "futsal", name: "Futsal", category: "Team sports" },
  { id: "basketball", name: "Basketball", category: "Team sports" },
  { id: "volleyball", name: "Volleyball", category: "Team sports" },
  { id: "beach-volleyball", name: "Beach volleyball", category: "Team sports" },
  { id: "handball", name: "Handball", category: "Team sports" },
  { id: "rugby", name: "Rugby", category: "Team sports" },
  { id: "american-football", name: "American football", category: "Team sports" },
  { id: "baseball", name: "Baseball", category: "Team sports" },
  { id: "softball", name: "Softball", category: "Team sports" },
  { id: "cricket", name: "Cricket", category: "Team sports" },
  { id: "field-hockey", name: "Field hockey", category: "Team sports" },
  { id: "ice-hockey", name: "Ice hockey", category: "Team sports" },
  { id: "water-polo", name: "Water polo", category: "Team sports" },
  { id: "ultimate-frisbee", name: "Ultimate frisbee", category: "Team sports" },
  { id: "lacrosse", name: "Lacrosse", category: "Team sports" },
  { id: "dodgeball", name: "Dodgeball", category: "Team sports" },

  // Racket sports
  { id: "tennis", name: "Tennis", category: "Racket sports" },
  { id: "padel", name: "Padel", category: "Racket sports" },
  { id: "badminton", name: "Badminton", category: "Racket sports" },
  { id: "squash", name: "Squash", category: "Racket sports" },
  { id: "table-tennis", name: "Table tennis", category: "Racket sports" },
  { id: "pickleball", name: "Pickleball", category: "Racket sports" },
  { id: "racquetball", name: "Racquetball", category: "Racket sports" },
  { id: "beach-tennis", name: "Beach tennis", category: "Racket sports" },

  // Running and endurance
  { id: "running", name: "Running", category: "Running and endurance" },
  { id: "jogging", name: "Jogging", category: "Running and endurance" },
  { id: "trail-running", name: "Trail running", category: "Running and endurance" },
  { id: "marathon", name: "Marathon training", category: "Running and endurance" },
  { id: "sprinting", name: "Sprinting", category: "Running and endurance" },
  { id: "triathlon", name: "Triathlon", category: "Running and endurance" },
  { id: "duathlon", name: "Duathlon", category: "Running and endurance" },
  { id: "obstacle-racing", name: "Obstacle racing", category: "Running and endurance" },

  // Fitness
  { id: "gym", name: "Gym", category: "Fitness and strength" },
  { id: "weight-training", name: "Weight training", category: "Fitness and strength" },
  { id: "bodybuilding", name: "Bodybuilding", category: "Fitness and strength" },
  { id: "powerlifting", name: "Powerlifting", category: "Fitness and strength" },
  { id: "crossfit", name: "CrossFit", category: "Fitness and strength" },
  { id: "functional-training", name: "Functional training", category: "Fitness and strength" },
  { id: "calisthenics", name: "Calisthenics", category: "Fitness and strength" },
  { id: "hiit", name: "HIIT", category: "Fitness and strength" },
  { id: "circuit-training", name: "Circuit training", category: "Fitness and strength" },
  { id: "street-workout", name: "Street workout", category: "Fitness and strength" },
  { id: "mobility", name: "Mobility training", category: "Fitness and strength" },
  { id: "stretching", name: "Stretching", category: "Fitness and strength" },

  // Martial arts
  { id: "boxing", name: "Boxing", category: "Martial arts" },
  { id: "kickboxing", name: "Kickboxing", category: "Martial arts" },
  { id: "muay-thai", name: "Muay Thai", category: "Martial arts" },
  { id: "mma", name: "MMA", category: "Martial arts" },
  { id: "bjj", name: "Brazilian jiu-jitsu", category: "Martial arts" },
  { id: "judo", name: "Judo", category: "Martial arts" },
  { id: "karate", name: "Karate", category: "Martial arts" },
  { id: "taekwondo", name: "Taekwondo", category: "Martial arts" },
  { id: "wrestling", name: "Wrestling", category: "Martial arts" },
  { id: "krav-maga", name: "Krav Maga", category: "Martial arts" },
  { id: "aikido", name: "Aikido", category: "Martial arts" },
  { id: "kung-fu", name: "Kung Fu", category: "Martial arts" },
  { id: "capoeira", name: "Capoeira", category: "Martial arts" },
  { id: "fencing", name: "Fencing", category: "Martial arts" },

  // Water sports
  { id: "swimming", name: "Swimming", category: "Water sports" },
  { id: "open-water-swimming", name: "Open-water swimming", category: "Water sports" },
  { id: "surfing", name: "Surfing", category: "Water sports" },
  { id: "windsurfing", name: "Windsurfing", category: "Water sports" },
  { id: "kitesurfing", name: "Kitesurfing", category: "Water sports" },
  { id: "paddleboarding", name: "Paddleboarding", category: "Water sports" },
  { id: "canoeing", name: "Canoeing", category: "Water sports" },
  { id: "kayaking", name: "Kayaking", category: "Water sports" },
  { id: "rowing", name: "Rowing", category: "Water sports" },
  { id: "sailing", name: "Sailing", category: "Water sports" },
  { id: "diving", name: "Diving", category: "Water sports" },
  { id: "scuba-diving", name: "Scuba diving", category: "Water sports" },
  { id: "snorkeling", name: "Snorkeling", category: "Water sports" },

  // Cycling
  { id: "road-cycling", name: "Road cycling", category: "Cycling" },
  { id: "mountain-biking", name: "Mountain biking", category: "Cycling" },
  { id: "bmx", name: "BMX", category: "Cycling" },
  { id: "gravel-cycling", name: "Gravel cycling", category: "Cycling" },
  { id: "indoor-cycling", name: "Indoor cycling", category: "Cycling" },
  { id: "bike-touring", name: "Bike touring", category: "Cycling" },
  { id: "urban-cycling", name: "Urban cycling", category: "Cycling" },

  // Outdoor
  { id: "hiking", name: "Hiking", category: "Outdoor and adventure" },
  { id: "trekking", name: "Trekking", category: "Outdoor and adventure" },
  { id: "mountaineering", name: "Mountaineering", category: "Outdoor and adventure" },
  { id: "climbing", name: "Climbing", category: "Outdoor and adventure" },
  { id: "bouldering", name: "Bouldering", category: "Outdoor and adventure" },
  { id: "via-ferrata", name: "Via ferrata", category: "Outdoor and adventure" },
  { id: "skiing", name: "Skiing", category: "Outdoor and adventure" },
  { id: "snowboarding", name: "Snowboarding", category: "Outdoor and adventure" },
  { id: "snowshoeing", name: "Snowshoeing", category: "Outdoor and adventure" },
  { id: "parkour", name: "Parkour", category: "Outdoor and adventure" },
  { id: "slacklining", name: "Slacklining", category: "Outdoor and adventure" },

  // Mind and body
  { id: "yoga", name: "Yoga", category: "Mind and body" },
  { id: "pilates", name: "Pilates", category: "Mind and body" },
  { id: "tai-chi", name: "Tai Chi", category: "Mind and body" },
  { id: "qi-gong", name: "Qi Gong", category: "Mind and body" },
  { id: "breathwork", name: "Breathwork", category: "Mind and body" },
  { id: "barre", name: "Barre", category: "Mind and body" },

  // Dance
  { id: "salsa", name: "Salsa", category: "Dance" },
  { id: "bachata", name: "Bachata", category: "Dance" },
  { id: "tango", name: "Tango", category: "Dance" },
  { id: "hip-hop", name: "Hip-hop", category: "Dance" },
  { id: "contemporary-dance", name: "Contemporary dance", category: "Dance" },
  { id: "ballet", name: "Ballet", category: "Dance" },
  { id: "jazz-dance", name: "Jazz dance", category: "Dance" },
  { id: "kpop-dance", name: "K-pop dance", category: "Dance" },
  { id: "ballroom-dance", name: "Ballroom dance", category: "Dance" },
  { id: "swing", name: "Swing", category: "Dance" },
  { id: "zumba", name: "Zumba", category: "Dance" },
  { id: "pole-dance", name: "Pole dance", category: "Dance" },
  { id: "persian-dance", name: "Persian dance", category: "Dance" },

  // Wheels and precision
  { id: "skateboarding", name: "Skateboarding", category: "Wheels and skill" },
  { id: "roller-skating", name: "Roller skating", category: "Wheels and skill" },
  { id: "inline-skating", name: "Inline skating", category: "Wheels and skill" },
  { id: "longboarding", name: "Longboarding", category: "Wheels and skill" },
  { id: "archery", name: "Archery", category: "Precision sports" },
  { id: "golf", name: "Golf", category: "Precision sports" },
  { id: "bowling", name: "Bowling", category: "Precision sports" },
  { id: "darts", name: "Darts", category: "Precision sports" },
  { id: "billiards", name: "Billiards", category: "Precision sports" },
  { id: "snooker", name: "Snooker", category: "Precision sports" },
  { id: "petanque", name: "Pétanque", category: "Precision sports" },

  // Other
  { id: "other", name: "Other sport", category: "Other" },
];