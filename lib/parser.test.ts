import { describe, it, expect } from "vitest";
import { parseArmyList, formatArmyList } from "./parser";
import { defaultDisplayOptions } from "./types";
import type { ArmyList, DisplayOptions, Unit } from "./types";
import { BARK_AT_THE_MOON, LOGAN_STEEL_CHAIR } from "./army-list/parse.fixtures";

function options(overrides: Partial<DisplayOptions> = {}): DisplayOptions {
  return { ...defaultDisplayOptions, ...overrides };
}

function list(units: Array<Partial<Unit> & { name: string }>, header: Partial<ArmyList> = {}): ArmyList {
  return {
    units: units.map((u) => ({ modelCount: 1, category: "other" as const, ...u })),
    ...header,
  };
}

describe("formatArmyList - condensed", () => {
  it("prefixes the line with faction and detachment", () => {
    const out = formatArmyList(
      list([{ name: "Raider" }], { faction: "Drukhari", detachment: "Realspace Raiders" }),
      options()
    );
    expect(out).toBe("Drukhari, Realspace Raiders: Raider");
  });

  it("falls back to whichever of faction or detachment is known", () => {
    const units = [{ name: "Raider" }];
    expect(formatArmyList(list(units, { faction: "Drukhari" }), options())).toBe("Drukhari: Raider");
    expect(formatArmyList(list(units, { detachment: "Realspace Raiders" }), options())).toBe(
      "Realspace Raiders: Raider"
    );
    expect(formatArmyList(list(units), options())).toBe("Raider");
  });

  it("writes a single multi-model unit as 1x<size>", () => {
    const out = formatArmyList(list([{ name: "Aggressor Squad", modelCount: 6 }]), options());
    expect(out).toBe("1x6 Aggressor Squad");
  });

  it("writes repeated same-size units as <units>x<size>", () => {
    const intercessors = { name: "Intercessors", modelCount: 5 };
    const out = formatArmyList(list([intercessors, intercessors, intercessors]), options());
    expect(out).toBe("3x5 Intercessors");
  });

  it("writes mixed sizes as the most common first, joined by a slash", () => {
    const out = formatArmyList(
      list([
        { name: "Intercessors", modelCount: 5 },
        { name: "Intercessors", modelCount: 5 },
        { name: "Intercessors", modelCount: 10 },
      ]),
      options()
    );
    expect(out).toBe("2x5/1x10 Intercessors");
  });

  it("drops the count for a lone single-model unit unless the prefix is forced", () => {
    const units = [{ name: "Raider" }];
    expect(formatArmyList(list(units), options())).toBe("Raider");
    expect(formatArmyList(list(units), options({ forceSingleUnitPrefix: true }))).toBe("1x Raider");
  });

  it("never shows a model count for characters", () => {
    const out = formatArmyList(
      list([{ name: "Chaplain Grimaldus", modelCount: 4, category: "characters" }]),
      options()
    );
    expect(out).toBe("Chaplain Grimaldus");
  });

  it("counts repeated characters as units", () => {
    const slaughterbound = { name: "Slaughterbound", category: "characters" as const };
    const out = formatArmyList(list([slaughterbound, slaughterbound]), options());
    expect(out).toBe("2x Slaughterbound");
  });

  it("keeps characters apart per enhancement, and merges them when enhancements are hidden", () => {
    const units = [
      { name: "Succubus", category: "characters" as const, enhancement: "Chronoshard" },
      { name: "Succubus", category: "characters" as const, enhancement: "Blood Dancer" },
    ];
    expect(formatArmyList(list(units), options())).toBe(
      "Succubus (Chronoshard), Succubus (Blood Dancer)"
    );
    expect(formatArmyList(list(units), options({ showEnhancements: false }))).toBe("2x Succubus");
  });

  it("returns an empty string when there are no units", () => {
    expect(formatArmyList(list([]), options())).toBe("");
  });
});

describe("formatArmyList - expanded", () => {
  const army = list(
    [
      { name: "Bjorn the Fell-Handed", category: "characters", points: 160 },
      {
        name: "Intercessor Squad",
        modelCount: 5,
        category: "battleline",
        points: 80,
        wargear: ["Bolt pistol", "Bolt rifle"],
        enhancement: "Wolf-touched",
      },
    ],
    { faction: "Space Marines", detachment: "Ironstorm Spearhead", totalPoints: 240 }
  );

  it("writes the faction and detachment header only when enabled", () => {
    const on = formatArmyList(army, options({ condensedFormat: false }));
    expect(on.startsWith("Faction: Space Marines\nDetachment: Ironstorm Spearhead\n\n")).toBe(true);
    const off = formatArmyList(army, options({ condensedFormat: false, showDetachment: false }));
    expect(off).not.toContain("Faction:");
  });

  it("separates sections with a blank line", () => {
    const out = formatArmyList(
      army,
      options({ condensedFormat: false, showDetachment: false, showEnhancements: false })
    );
    expect(out).toBe("Bjorn the Fell-Handed\n\n5x Intercessor Squad");
  });

  it("adds wargear in brackets when enabled", () => {
    const out = formatArmyList(army, options({ condensedFormat: false, showWeapons: true }));
    expect(out).toContain("5x Intercessor Squad [Bolt pistol, Bolt rifle]");
  });

  it("adds the enhancement when enabled", () => {
    const out = formatArmyList(army, options({ condensedFormat: false }));
    expect(out).toContain("5x Intercessor Squad - Enhancement: Wolf-touched");
  });

  it("adds per-unit points and the army total when enabled", () => {
    const out = formatArmyList(
      army,
      options({ condensedFormat: false, showPoints: true, showEnhancements: false })
    );
    expect(out).toContain("Bjorn the Fell-Handed - 160pts");
    expect(out.endsWith("\n\nTotal: 240pts")).toBe(true);
  });
});

describe("parseArmyList - mapping onto the display model", () => {
  const army = parseArmyList(BARK_AT_THE_MOON);

  it("joins the chapter onto the faction", () => {
    expect(army.faction).toBe("Space Marines - Space Wolves");
  });

  it("carries the category through, and defaults an unknown model count to 1", () => {
    expect(army.units.find((u) => u.name === "Logan Grimnar")?.category).toBe("characters");
    const terminators = army.units.find((u) => u.name === "Wolf Guard Terminators");
    expect(terminators?.category).toBe("other");
    expect(terminators?.modelCount).toBe(5);
    expect(army.units.every((u) => (u.modelCount ?? 0) >= 1)).toBe(true);
  });
});

describe("parseArmyList + formatArmyList - 11th edition app export", () => {
  it("puts attached leaders up front and their bodyguards in their own bucket", () => {
    const out = formatArmyList(parseArmyList(BARK_AT_THE_MOON), options());
    expect(out.startsWith("Space Marines - Space Wolves, Legends of Saga and Song and Saga of the Beastslayer (3 DP): ")).toBe(
      true
    );
    // Attached leaders read as characters, so no model count.
    expect(out).toContain("Logan Grimnar");
    expect(out).not.toContain("1x1 Logan Grimnar");
    // Their bodyguards keep their squad size.
    expect(out).toContain("2x5 Wolf Guard Terminators");
    expect(out).toContain("1x6 Wolf Guard Headtakers");
  });

  it("reads the detachment from the older flattened export too", () => {
    const out = formatArmyList(parseArmyList(LOGAN_STEEL_CHAIR), options());
    expect(out.startsWith("Space Marines - Space Wolves, Legends of Saga and Song and Saga of the Great Wolf (3 DP): ")).toBe(
      true
    );
  });
});

describe("formatArmyList - detachment cost", () => {
  const army = list([{ name: "Raider" }], {
    faction: "Drukhari",
    detachment: "Realspace Raiders",
    detachmentPoints: 3,
  });

  it("puts the cost behind the detachment in condensed", () => {
    expect(formatArmyList(army, options())).toBe(
      "Drukhari, Realspace Raiders (3 DP): Raider"
    );
  });

  it("puts the cost behind the detachment in expanded", () => {
    const out = formatArmyList(army, options({ condensedFormat: false }));
    expect(out).toContain("Detachment: Realspace Raiders (3 DP)");
  });

  it("omits the cost when the export does not state one", () => {
    const noCost = list([{ name: "Raider" }], {
      faction: "Drukhari",
      detachment: "Realspace Raiders",
    });
    expect(formatArmyList(noCost, options())).toBe("Drukhari, Realspace Raiders: Raider");
  });
});

describe("formatArmyList - attached leaders", () => {
  // The parser emits characters first, so the fixture mirrors that order.
  const army = list([
    { name: "Logan Grimnar", category: "characters", enhancement: "Wolf-touched" },
    { name: "Arjac Rockfist", category: "characters" },
    {
      name: "Wolf Guard Terminators",
      modelCount: 5,
      leaders: [{ index: 0, name: "Logan Grimnar" }],
    },
    {
      name: "Wolf Guard Terminators",
      modelCount: 5,
      leaders: [{ index: 1, name: "Arjac Rockfist" }],
    },
  ]);

  it("leaves the output alone while the option is off", () => {
    expect(formatArmyList(army, options())).toBe(
      "Logan Grimnar (Wolf-touched), Arjac Rockfist, 2x5 Wolf Guard Terminators"
    );
  });

  it("writes the attached unit behind its character, and drops it from the list", () => {
    const out = formatArmyList(army, options({ showAttachedLeaders: true }));
    expect(out).toBe(
      "Logan Grimnar (Wolf-touched) + 1x5 Wolf Guard Terminators, " +
        "Arjac Rockfist + 1x5 Wolf Guard Terminators"
    );
  });

  it("gives each character its own unit when both have the same name", () => {
    const twins = list([
      {
        name: "Lord on Juggernaut",
        category: "characters",
        enhancement: "Disciple of Khorne",
      },
      { name: "Lord on Juggernaut", category: "characters" },
      { name: "Bloodcrushers", modelCount: 6, leaders: [{ index: 0, name: "Lord on Juggernaut" }] },
      { name: "Bloodcrushers", modelCount: 3, leaders: [{ index: 1, name: "Lord on Juggernaut" }] },
    ]);
    expect(formatArmyList(twins, options({ showAttachedLeaders: true }))).toBe(
      "Lord on Juggernaut (Disciple of Khorne) + 1x6 Bloodcrushers, " +
        "Lord on Juggernaut + 1x3 Bloodcrushers"
    );
  });

  it("merges attached units of the same name, same as the list does", () => {
    const doubled = list([
      { name: "Palatine", category: "characters" },
      { name: "Battle Sisters Squad", modelCount: 5, leaders: [{ index: 0, name: "Palatine" }] },
      { name: "Battle Sisters Squad", modelCount: 5, leaders: [{ index: 0, name: "Palatine" }] },
    ]);
    expect(formatArmyList(doubled, options({ showAttachedLeaders: true }))).toBe(
      "Palatine + 2x5 Battle Sisters Squad"
    );
  });

  it("names the leader behind its unit in the expanded form, which keeps a line per unit", () => {
    const out = formatArmyList(
      army,
      options({ condensedFormat: false, showAttachedLeaders: true, showEnhancements: false })
    );
    expect(out).toContain("5x Wolf Guard Terminators (Logan Grimnar)");
  });
});

describe("formatArmyList - model counts in the expanded form", () => {
  it("prefixes a multi-model unit with its size and leaves characters bare", () => {
    const army = list([
      { name: "Chaplain Grimaldus", category: "characters", modelCount: 4 },
      { name: "Intercessor Squad", modelCount: 5 },
      { name: "Gladiator Lancer", modelCount: 1 },
    ]);
    const out = formatArmyList(army, options({ condensedFormat: false }));
    expect(out).toBe("Chaplain Grimaldus\n\n5x Intercessor Squad\nGladiator Lancer");
  });
});
