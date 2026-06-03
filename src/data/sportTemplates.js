export const SPORTS = [
  "Soccer",
  "Basketball",
  "Baseball",
  "Football",
  "Volleyball",
  "Custom",
];

export const SPORT_STAT_TEMPLATES = {
  Soccer: [
    { key: "goals",        label: "Goals",         type: "number" },
    { key: "assists",      label: "Assists",        type: "number" },
    { key: "yellowCards",  label: "Yellow Cards",   type: "number" },
    { key: "redCards",     label: "Red Cards",      type: "number" },
    { key: "cleanSheets",  label: "Clean Sheets",   type: "number" },
  ],
  Basketball: [
    { key: "points",       label: "Points",         type: "number" },
    { key: "rebounds",     label: "Rebounds",       type: "number" },
    { key: "assists",      label: "Assists",        type: "number" },
    { key: "steals",       label: "Steals",         type: "number" },
    { key: "blocks",       label: "Blocks",         type: "number" },
  ],
  Baseball: [
    { key: "atBats",       label: "At Bats",        type: "number" },
    { key: "hits",         label: "Hits",           type: "number" },
    { key: "runs",         label: "Runs",           type: "number" },
    { key: "rbis",         label: "RBIs",           type: "number" },
    { key: "strikeouts",   label: "Strikeouts",     type: "number" },
    { key: "homeRuns",     label: "Home Runs",      type: "number" },
  ],
  Football: [
    { key: "touchdowns",   label: "Touchdowns",     type: "number" },
    { key: "yards",        label: "Yards",          type: "number" },
    { key: "completions",  label: "Completions",    type: "number" },
    { key: "interceptions",label: "Interceptions",  type: "number" },
    { key: "sacks",        label: "Sacks",          type: "number" },
  ],
  Volleyball: [
    { key: "kills",        label: "Kills",          type: "number" },
    { key: "aces",         label: "Aces",           type: "number" },
    { key: "blocks",       label: "Blocks",         type: "number" },
    { key: "digs",         label: "Digs",           type: "number" },
    { key: "errors",       label: "Errors",         type: "number" },
  ],
  Custom: [],
};

export const SPORT_ABBR = {
  Soccer: "SOC", Basketball: "BSK", Baseball: "BSB",
  Football: "FTB", Volleyball: "VBL", Custom: "LGE",
};

export const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];