function photoRefFromPlace(place) {
  return (place.photos && place.photos[0] && place.photos[0].photo_reference) || null;
}

module.exports = { photoRefFromPlace };
