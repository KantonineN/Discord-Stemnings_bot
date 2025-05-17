/* Returnerer navnet på en højtid eller sæson baseret på den aktuelle dato.
Bruges til at vælge, hvilken gruppe af historier der skal hentes fra databasen. */
function getSeasonOrHoliday(date = new Date()) {
    const month = date.getMonth() + 1; // getMonth() returnerer 0-11, så vi lægger 1 til
    const day = date.getDate();

    // 🎄 Jul: Hele december
    if (month === 12) return 'christmas';

    // 🐣 Påske: Ca. marts til midten af april (for simplet brug)
    if (month === 4 && day < 20) return 'easter';

    // 🎃 Halloween: Hele oktober
    if (month === 10) return 'halloween';

    // ❄️ Vinter: Januar, februar og november (udenfor højtider)
     if ([1, 2, 11].includes(month)) return 'winter';

    // 🌱 Forår: April (efter påske) og maj
    if (month === 3 || (month === 4 && day >= 20) || month === 5) return 'spring';

    // ☀️ Sommer: Juni, juli og august
    if ([6, 7, 8].includes(month)) return 'summer';

    // 🍂 Efterår: September (og evt. som fallback)
    if (month === 9) return 'fall';

    // Hvis ingen af ovenstående matcher, brug "standard"
    return 'standard';
}

module.exports = { getSeasonOrHoliday };