// a decent word list - pulled these from a bunch of online lists and trimmed it down
// TODO: maybe load from a json file later so it's easier to add more

const words = [
  // animals
  'cat', 'dog', 'elephant', 'giraffe', 'penguin', 'dolphin', 'parrot', 'tiger',
  'monkey', 'kangaroo', 'crocodile', 'butterfly', 'owl', 'shark', 'octopus',
  // food
  'pizza', 'burger', 'sushi', 'taco', 'pasta', 'sandwich', 'donut', 'pancake',
  'waffle', 'cupcake', 'hotdog', 'pretzel', 'cookie', 'brownie', 'popcorn',
  // objects
  'umbrella', 'guitar', 'telescope', 'compass', 'lantern', 'trophy', 'backpack',
  'hammer', 'anchor', 'clock', 'camera', 'candle', 'ladder', 'magnet', 'mirror',
  // places
  'lighthouse', 'volcano', 'waterfall', 'castle', 'forest', 'desert', 'island',
  'canyon', 'glacier', 'cave', 'stadium', 'airport', 'library', 'museum',
  // actions (harder!)
  'running', 'swimming', 'flying', 'dancing', 'climbing', 'fishing', 'reading',
  'painting', 'cooking', 'laughing', 'sleeping', 'jumping', 'surfing', 'boxing',
];

function getRandom(count = 3) {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = { getRandom };
