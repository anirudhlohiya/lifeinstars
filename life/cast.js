// Website demo: sample names only, no role labels.
window.LIFE = {
  title: "Life is a journey",
  subtitle: ["Some walk with you for a while.", "Others stay in your sky forever."],
  lifeSeconds: 50,
  preBirthSeconds: 2,
  endingSeconds: 10,
  story: {
    ending: "star",
    me: { name: "You", role: "", finalAge: 85 },
    people: [
      { name: "Grandfather", role: "", relation: "grandfather", fate: "dies", to: 12 },
      { name: "Grandmother", role: "", relation: "grandmother", fate: "dies", to: 22 },
      { name: "Dad", role: "", relation: "father", fate: "dies", to: 72 },
      { name: "Mom", role: "", relation: "mother", fate: "dies", to: 78 },
      { name: "Sister", role: "", relation: "sibling", fate: "leaves", to: 24 },
      { name: "Best Friend", role: "", relation: "friend", from: 6, fate: "leaves", to: 30 },
      { name: "School Friend", role: "", relation: "friend", from: 9, fate: "passes" },
      { name: "First Love", role: "", relation: "friend", from: 16, fate: "leaves", to: 19 },
      { name: "College Friend", role: "", relation: "friend", from: 20, fate: "passes" },
      { name: "Wife", role: "", relation: "partner", from: 27, fate: "dies", to: 82 },
      { name: "Son", role: "", relation: "child", from: 31, fate: "stays" },
      { name: "Daughter", role: "", relation: "child", from: 34, fate: "stays" },
      { name: "Coworker", role: "", relation: "other", from: 40, fate: "passes" },
    ],
  },
};
