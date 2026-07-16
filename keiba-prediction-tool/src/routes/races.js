const express = require('express');
const raceStore = require('../lib/raceStore');
const tipsters = require('../data/tipsters.json');

const router = express.Router();

router.get('/meta', (req, res) => {
  res.json(raceStore.listMeta());
});

router.get('/tipsters', (req, res) => {
  res.json(tipsters);
});

router.get('/races', (req, res) => {
  const { date, category, venue, raceNumber } = req.query;
  res.json(raceStore.listRaces({ date, category, venue, raceNumber }));
});

router.get('/races/:id', (req, res) => {
  const race = raceStore.getRaceById(req.params.id);
  if (!race) {
    return res.status(404).json({ error: 'race not found' });
  }
  res.json(race);
});

module.exports = router;
