import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Plus, Trash2, Pencil, Check, ChevronUp, ChevronDown, Dumbbell,
  TrendingUp, Scale, Flame, X, Users,
} from "lucide-react";
import { storageGet, storageSet } from "./storage.js";

const PEOPLE = ["Matthew", "Zach"];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const DEFAULT_SPLITS = [
  {
    id: uid(),
    name: "Push Pull Legs",
    owner: "Matthew",
    days: [
      { id: uid(), name: "Push", exercises: [
        { id: uid(), name: "Bench Press" },
        { id: uid(), name: "Overhead Press" },
        { id: uid(), name: "Tricep Pushdown" },
      ] },
      { id: uid(), name: "Pull", exercises: [
        { id: uid(), name: "Deadlift" },
        { id: uid(), name: "Pull-Up" },
        { id: uid(), name: "Barbell Row" },
      ] },
      { id: uid(), name: "Legs", exercises: [
        { id: uid(), name: "Squat" },
        { id: uid(), name: "Leg Press" },
        { id: uid(), name: "Calf Raise" },
      ] },
    ],
  },
];

function volumeOfSets(sets) {
  return sets.reduce((sum, s) => sum + (Number(s.reps) || 0) * (Number(s.weight) || 0), 0);
}
function volumeOfLog(log) {
  return log.entries.reduce((sum, e) => sum + volumeOfSets(e.sets), 0);
}
function maxWeightOfSets(sets) {
  return sets.reduce((m, s) => Math.max(m, Number(s.weight) || 0), 0);
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [whoami, setWhoami] = useState(null); // this device's remembered identity
  const [activePerson, setActivePerson] = useState(null);
  const [splits, setSplits] = useState(DEFAULT_SPLITS);
  const [logs, setLogs] = useState([]);
  const [bodyweight, setBodyweight] = useState([]);
  const [tab, setTab] = useState("workout");
  const [editMode, setEditMode] = useState(false);
  const [selectedSplitId, setSelectedSplitId] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [draft, setDraft] = useState({});
  const [banner, setBanner] = useState(null);
  const [newSplitInput, setNewSplitInput] = useState(null); // string when creating

  useEffect(() => {
    (async () => {
      const [who, s, l, b] = await Promise.all([
        storageGet("whoami", null, false),
        storageGet("splits", DEFAULT_SPLITS, true),
        storageGet("logs", [], true),
        storageGet("bodyweight", [], true),
      ]);
      setWhoami(who);
      setActivePerson(who || PEOPLE[0]);
      setSplits(s);
      setLogs(l);
      setBodyweight(b);
      setSelectedSplitId(s[0]?.id ?? null);
      setSelectedDayId(s[0]?.days?.[0]?.id ?? null);
      setLoaded(true);
    })();
  }, []);

  function chooseWhoami(person) {
    setWhoami(person);
    setActivePerson(person);
    storageSet("whoami", person, false);
  }
  function switchActivePerson(person) {
    setActivePerson(person);
    storageSet("whoami", person, false);
    setWhoami(person);
  }

  const selectedSplit = useMemo(
    () => splits.find((s) => s.id === selectedSplitId) || splits[0] || null,
    [splits, selectedSplitId]
  );
  const selectedDay = useMemo(
    () => selectedSplit?.days.find((d) => d.id === selectedDayId) || selectedSplit?.days[0] || null,
    [selectedSplit, selectedDayId]
  );

  useEffect(() => {
    if (!selectedSplit) return;
    if (!selectedSplit.days.find((d) => d.id === selectedDayId)) {
      setSelectedDayId(selectedSplit.days[0]?.id ?? null);
    }
  }, [selectedSplit]);

  useEffect(() => {
    if (!selectedDay) return;
    setDraft((prev) => {
      const next = { ...prev };
      selectedDay.exercises.forEach((ex) => {
        if (!next[ex.id]) next[ex.id] = [{ reps: "", weight: "" }];
      });
      return next;
    });
  }, [selectedDay?.id, selectedDay?.exercises.length]);

  const persistSplits = useCallback((next) => {
    setSplits(next);
    storageSet("splits", next, true);
  }, []);
  const persistLogs = useCallback((next) => {
    setLogs(next);
    storageSet("logs", next, true);
  }, []);
  const persistBodyweight = useCallback((next) => {
    setBodyweight(next);
    storageSet("bodyweight", next, true);
  }, []);

  // ---------- Split management ----------
  function addSplit(name) {
    const fresh = { id: uid(), name: name || "New Split", owner: activePerson, days: [] };
    const next = [...splits, fresh];
    persistSplits(next);
    setSelectedSplitId(fresh.id);
    setEditMode(true);
    setNewSplitInput(null);
  }
  function deleteSplit(splitId) {
    const next = splits.filter((s) => s.id !== splitId);
    persistSplits(next);
    if (selectedSplitId === splitId) setSelectedSplitId(next[0]?.id ?? null);
  }
  function renameSplit(splitId, name) {
    persistSplits(splits.map((s) => (s.id === splitId ? { ...s, name } : s)));
  }
  function addDay() {
    if (!selectedSplit) return;
    persistSplits(splits.map((s) =>
      s.id === selectedSplit.id ? { ...s, days: [...s.days, { id: uid(), name: "New Day", exercises: [] }] } : s
    ));
  }
  function removeDay(dayId) {
    persistSplits(splits.map((s) =>
      s.id === selectedSplit.id ? { ...s, days: s.days.filter((d) => d.id !== dayId) } : s
    ));
  }
  function renameDay(dayId, name) {
    persistSplits(splits.map((s) =>
      s.id === selectedSplit.id ? { ...s, days: s.days.map((d) => (d.id === dayId ? { ...d, name } : d)) } : s
    ));
  }
  function moveDay(dayId, dir) {
    persistSplits(splits.map((s) => {
      if (s.id !== selectedSplit.id) return s;
      const idx = s.days.findIndex((d) => d.id === dayId);
      const swap = idx + dir;
      if (swap < 0 || swap >= s.days.length) return s;
      const days = [...s.days];
      [days[idx], days[swap]] = [days[swap], days[idx]];
      return { ...s, days };
    }));
  }
  function addExercise(dayId) {
    persistSplits(splits.map((s) => {
      if (s.id !== selectedSplit.id) return s;
      return { ...s, days: s.days.map((d) => d.id === dayId ? { ...d, exercises: [...d.exercises, { id: uid(), name: "New Exercise" }] } : d) };
    }));
  }
  function removeExercise(dayId, exId) {
    persistSplits(splits.map((s) => {
      if (s.id !== selectedSplit.id) return s;
      return { ...s, days: s.days.map((d) => d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d) };
    }));
  }
  function renameExercise(dayId, exId, name) {
    persistSplits(splits.map((s) => {
      if (s.id !== selectedSplit.id) return s;
      return { ...s, days: s.days.map((d) => d.id === dayId ? { ...d, exercises: d.exercises.map((e) => e.id === exId ? { ...e, name } : e) } : d) };
    }));
  }
  function moveExercise(dayId, exId, dir) {
    persistSplits(splits.map((s) => {
      if (s.id !== selectedSplit.id) return s;
      return {
        ...s,
        days: s.days.map((d) => {
          if (d.id !== dayId) return d;
          const idx = d.exercises.findIndex((e) => e.id === exId);
          const swap = idx + dir;
          if (swap < 0 || swap >= d.exercises.length) return d;
          const exercises = [...d.exercises];
          [exercises[idx], exercises[swap]] = [exercises[swap], exercises[idx]];
          return { ...d, exercises };
        }),
      };
    }));
  }

  // ---------- Logging (history keyed by exercise NAME + person, so it survives edits/deletes) ----------
  function getLastSetsForExercise(exerciseName) {
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].person !== activePerson) continue;
      const entry = logs[i].entries.find((e) => e.exerciseName === exerciseName);
      if (entry && entry.sets.length) return entry.sets;
    }
    return null;
  }
  function updateSet(exId, setIdx, field, value) {
    setDraft((prev) => {
      const sets = [...(prev[exId] || [])];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      return { ...prev, [exId]: sets };
    });
  }
  function addSet(exId) {
    setDraft((prev) => ({ ...prev, [exId]: [...(prev[exId] || []), { reps: "", weight: "" }] }));
  }
  function removeSet(exId, setIdx) {
    setDraft((prev) => ({ ...prev, [exId]: (prev[exId] || []).filter((_, i) => i !== setIdx) }));
  }

  function saveWorkout() {
    if (!selectedDay || !selectedSplit) return;
    const entries = selectedDay.exercises
      .map((ex) => ({
        exerciseName: ex.name,
        sets: (draft[ex.id] || []).filter((s) => s.reps !== "" && s.weight !== ""),
      }))
      .filter((e) => e.sets.length > 0);

    if (entries.length === 0) {
      setBanner({ type: "warn", text: "Add at least one set (reps + weight) before saving." });
      return;
    }

    const newLog = {
      id: uid(),
      person: activePerson,
      date: todayISO(),
      splitId: selectedSplit.id,
      splitName: selectedSplit.name,
      dayName: selectedDay.name,
      entries,
    };
    const prevSameDay = [...logs].reverse().find((l) => l.person === activePerson && l.dayName === selectedDay.name);
    const newVolume = volumeOfLog(newLog);

    persistLogs([...logs, newLog]);
    setDraft((prev) => {
      const reset = { ...prev };
      selectedDay.exercises.forEach((ex) => (reset[ex.id] = [{ reps: "", weight: "" }]));
      return reset;
    });

    if (prevSameDay) {
      const prevVolume = volumeOfLog(prevSameDay);
      const diff = newVolume - prevVolume;
      const pct = prevVolume > 0 ? Math.round((diff / prevVolume) * 100) : 0;
      setBanner({
        type: diff >= 0 ? "good" : "warn",
        text: diff >= 0
          ? `Logged for ${activePerson}. Volume up ${pct}% vs your last ${selectedDay.name} day.`
          : `Logged for ${activePerson}. Volume down ${Math.abs(pct)}% vs your last ${selectedDay.name} day.`,
      });
    } else {
      setBanner({ type: "good", text: `Logged for ${activePerson}. First ${selectedDay.name} day on record.` });
    }
  }

  // ---------- Body weight ----------
  const [bwInput, setBwInput] = useState("");
  function logBodyweight() {
    const w = Number(bwInput);
    if (!w) return;
    const today = todayISO();
    const rest = bodyweight.filter((b) => !(b.date === today && b.person === activePerson));
    const next = [...rest, { id: uid(), person: activePerson, date: today, weight: w }].sort((a, b) => a.date.localeCompare(b.date));
    persistBodyweight(next);
    setBwInput("");
  }

  // ---------- Chart data (all scoped to activePerson, and pulled from full log history so deleted exercises/days still show) ----------
  const myLogs = useMemo(() => logs.filter((l) => l.person === activePerson), [logs, activePerson]);
  const myBodyweight = useMemo(() => bodyweight.filter((b) => b.person === activePerson), [bodyweight, activePerson]);

  const overallData = useMemo(
    () => myLogs.map((l) => ({ date: fmtDate(l.date), score: Math.round(volumeOfLog(l)) })),
    [myLogs]
  );
  const bodyweightData = useMemo(
    () => myBodyweight.map((b) => ({ date: fmtDate(b.date), weight: b.weight })),
    [myBodyweight]
  );

  const allExerciseNames = useMemo(() => {
    const names = new Set();
    myLogs.forEach((l) => l.entries.forEach((e) => names.add(e.exerciseName)));
    splits.forEach((s) => s.days.forEach((d) => d.exercises.forEach((e) => names.add(e.name))));
    return Array.from(names);
  }, [myLogs, splits]);
  const [selectedExName, setSelectedExName] = useState(null);
  useEffect(() => {
    if ((!selectedExName || !allExerciseNames.includes(selectedExName)) && allExerciseNames.length) {
      setSelectedExName(allExerciseNames[0]);
    }
  }, [allExerciseNames, selectedExName]);
  const exerciseData = useMemo(() => {
    if (!selectedExName) return [];
    return myLogs
      .filter((l) => l.entries.some((e) => e.exerciseName === selectedExName))
      .map((l) => {
        const entry = l.entries.find((e) => e.exerciseName === selectedExName);
        return { date: fmtDate(l.date), weight: maxWeightOfSets(entry.sets) };
      });
  }, [myLogs, selectedExName]);

  const allDayNames = useMemo(() => {
    const names = new Set();
    myLogs.forEach((l) => names.add(l.dayName));
    splits.forEach((s) => s.days.forEach((d) => names.add(d.name)));
    return Array.from(names);
  }, [myLogs, splits]);
  const [selectedDayName, setSelectedDayName] = useState(null);
  useEffect(() => {
    if ((!selectedDayName || !allDayNames.includes(selectedDayName)) && allDayNames.length) {
      setSelectedDayName(allDayNames[0]);
    }
  }, [allDayNames, selectedDayName]);
  const dayVolumeData = useMemo(() => {
    if (!selectedDayName) return [];
    return myLogs
      .filter((l) => l.dayName === selectedDayName)
      .map((l) => ({ date: fmtDate(l.date), volume: Math.round(volumeOfLog(l)) }));
  }, [myLogs, selectedDayName]);

  if (!loaded) {
    return (
      <div className="gt-app gt-loading">
        <Styles />
        <div className="gt-spinner" />
      </div>
    );
  }

  if (!whoami) {
    return (
      <div className="gt-app gt-loading">
        <Styles />
        <div className="gt-whoami">
          <div className="gt-header-title">
            <Dumbbell size={22} strokeWidth={2.5} />
            <span>IRON LOG</span>
          </div>
          <p className="gt-whoami-sub">Who's using this phone?</p>
          <div className="gt-whoami-btns">
            {PEOPLE.map((p) => (
              <button key={p} className="gt-whoami-btn" onClick={() => chooseWhoami(p)}>{p}</button>
            ))}
          </div>
          <p className="gt-whoami-note">You can switch later from the top of the app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gt-app">
      <Styles />
      <header className="gt-header">
        <div className="gt-header-title">
          <Dumbbell size={20} strokeWidth={2.5} />
          <span>IRON LOG</span>
        </div>
        <div className="gt-person-switch">
          {PEOPLE.map((p) => (
            <button
              key={p}
              className={`gt-person-btn ${activePerson === p ? "active" : ""}`}
              onClick={() => switchActivePerson(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="gt-shared-note"><Users size={11} /> Splits &amp; history sync between you and {PEOPLE.find(p=>p!==activePerson)}</div>
      </header>

      {banner && (
        <div className={`gt-banner gt-banner-${banner.type}`} onClick={() => setBanner(null)}>
          <span>{banner.text}</span>
          <X size={16} />
        </div>
      )}

      <main className="gt-main">
        {tab === "workout" && (
          <WorkoutTab
            splits={splits}
            selectedSplit={selectedSplit}
            selectedSplitId={selectedSplitId}
            setSelectedSplitId={setSelectedSplitId}
            editMode={editMode}
            setEditMode={setEditMode}
            selectedDay={selectedDay}
            selectedDayId={selectedDayId}
            setSelectedDayId={setSelectedDayId}
            draft={draft}
            addSplit={addSplit}
            deleteSplit={deleteSplit}
            renameSplit={renameSplit}
            newSplitInput={newSplitInput}
            setNewSplitInput={setNewSplitInput}
            addDay={addDay}
            removeDay={removeDay}
            renameDay={renameDay}
            moveDay={moveDay}
            addExercise={addExercise}
            removeExercise={removeExercise}
            renameExercise={renameExercise}
            moveExercise={moveExercise}
            getLastSetsForExercise={getLastSetsForExercise}
            updateSet={updateSet}
            addSet={addSet}
            removeSet={removeSet}
            saveWorkout={saveWorkout}
            activePerson={activePerson}
          />
        )}

        {tab === "progress" && (
          <ProgressTab
            activePerson={activePerson}
            bwInput={bwInput}
            setBwInput={setBwInput}
            logBodyweight={logBodyweight}
            bodyweightData={bodyweightData}
            overallData={overallData}
            allExerciseNames={allExerciseNames}
            selectedExName={selectedExName}
            setSelectedExName={setSelectedExName}
            exerciseData={exerciseData}
            allDayNames={allDayNames}
            selectedDayName={selectedDayName}
            setSelectedDayName={setSelectedDayName}
            dayVolumeData={dayVolumeData}
          />
        )}
      </main>

      <nav className="gt-nav">
        <button className={`gt-nav-btn ${tab === "workout" ? "active" : ""}`} onClick={() => setTab("workout")}>
          <Dumbbell size={20} />
          <span>Workout</span>
        </button>
        <button className={`gt-nav-btn ${tab === "progress" ? "active" : ""}`} onClick={() => setTab("progress")}>
          <TrendingUp size={20} />
          <span>Progress</span>
        </button>
      </nav>
    </div>
  );
}

function WorkoutTab(props) {
  const {
    splits, selectedSplit, selectedSplitId, setSelectedSplitId, editMode, setEditMode,
    selectedDay, selectedDayId, setSelectedDayId, draft,
    addSplit, deleteSplit, renameSplit, newSplitInput, setNewSplitInput,
    addDay, removeDay, renameDay, moveDay, addExercise, removeExercise, renameExercise, moveExercise,
    getLastSetsForExercise, updateSet, addSet, removeSet, saveWorkout, activePerson,
  } = props;

  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="gt-tab">
      <div className="gt-row-between">
        <h1 className="gt-h1">{editMode ? "Edit Split" : "Today's Lift"}</h1>
        {splits.length > 0 && (
          <button className={`gt-edit-toggle ${editMode ? "active" : ""}`} onClick={() => { setEditMode(!editMode); setConfirmDelete(false); }}>
            {editMode ? <Check size={16} /> : <Pencil size={16} />}
            <span>{editMode ? "Done" : "Edit"}</span>
          </button>
        )}
      </div>

      <div className="gt-split-picker">
        {splits.map((s) => (
          <button
            key={s.id}
            className={`gt-split-chip ${selectedSplitId === s.id ? "active" : ""}`}
            onClick={() => setSelectedSplitId(s.id)}
          >
            <span className="gt-split-chip-name">{s.name}</span>
            <span className="gt-split-chip-owner">by {s.owner}</span>
          </button>
        ))}
        {newSplitInput === null ? (
          <button className="gt-split-chip gt-split-chip-new" onClick={() => setNewSplitInput("")}>
            <Plus size={14} /> New Split
          </button>
        ) : (
          <div className="gt-new-split-form">
            <input
              className="gt-input"
              autoFocus
              placeholder="Split name"
              value={newSplitInput}
              onChange={(e) => setNewSplitInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSplit(newSplitInput)}
            />
            <button className="gt-icon-btn" onClick={() => addSplit(newSplitInput)}><Check size={16} /></button>
            <button className="gt-icon-btn gt-icon-danger" onClick={() => setNewSplitInput(null)}><X size={16} /></button>
          </div>
        )}
      </div>

      {!selectedSplit ? (
        <div className="gt-empty">No splits yet. Tap "New Split" to build one.</div>
      ) : editMode ? (
        <div className="gt-editor">
          <div className="gt-split-name-row">
            <input
              className="gt-input gt-split-title-input"
              value={selectedSplit.name}
              onChange={(e) => renameSplit(selectedSplit.id, e.target.value)}
            />
            {!confirmDelete ? (
              <button className="gt-icon-btn gt-icon-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} />
              </button>
            ) : (
              <div className="gt-confirm-row">
                <span>Delete split?</span>
                <button className="gt-icon-btn gt-icon-danger" onClick={() => { deleteSplit(selectedSplit.id); setConfirmDelete(false); }}>Yes</button>
                <button className="gt-icon-btn" onClick={() => setConfirmDelete(false)}>No</button>
              </div>
            )}
          </div>
          <p className="gt-card-sub">Created by {selectedSplit.owner}. Anyone can log against this split, and history keeps even if you edit or delete exercises here.</p>

          {selectedSplit.days.map((day, di) => (
            <div className="gt-day-card" key={day.id}>
              <div className="gt-day-card-head">
                <input
                  className="gt-input gt-day-name"
                  value={day.name}
                  onChange={(e) => renameDay(day.id, e.target.value)}
                />
                <div className="gt-icon-row">
                  <button className="gt-icon-btn" onClick={() => moveDay(day.id, -1)} disabled={di === 0}>
                    <ChevronUp size={16} />
                  </button>
                  <button className="gt-icon-btn" onClick={() => moveDay(day.id, 1)} disabled={di === selectedSplit.days.length - 1}>
                    <ChevronDown size={16} />
                  </button>
                  <button className="gt-icon-btn gt-icon-danger" onClick={() => removeDay(day.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="gt-ex-list">
                {day.exercises.map((ex, ei) => (
                  <div className="gt-ex-row" key={ex.id}>
                    <input
                      className="gt-input gt-ex-name"
                      value={ex.name}
                      onChange={(e) => renameExercise(day.id, ex.id, e.target.value)}
                    />
                    <div className="gt-icon-row">
                      <button className="gt-icon-btn" onClick={() => moveExercise(day.id, ex.id, -1)} disabled={ei === 0}>
                        <ChevronUp size={14} />
                      </button>
                      <button className="gt-icon-btn" onClick={() => moveExercise(day.id, ex.id, 1)} disabled={ei === day.exercises.length - 1}>
                        <ChevronDown size={14} />
                      </button>
                      <button className="gt-icon-btn gt-icon-danger" onClick={() => removeExercise(day.id, ex.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="gt-add-btn" onClick={() => addExercise(day.id)}>
                <Plus size={14} /> Add exercise
              </button>
            </div>
          ))}
          <button className="gt-add-btn gt-add-day" onClick={addDay}>
            <Plus size={16} /> Add training day
          </button>
        </div>
      ) : (
        <>
          <div className="gt-day-picker">
            {selectedSplit.days.map((d) => (
              <button
                key={d.id}
                className={`gt-day-chip ${selectedDayId === d.id ? "active" : ""}`}
                onClick={() => setSelectedDayId(d.id)}
              >
                {d.name}
              </button>
            ))}
          </div>

          {!selectedDay || selectedSplit.days.length === 0 || selectedDay.exercises.length === 0 ? (
            <div className="gt-empty">No exercises on this day yet. Tap "Edit" to add some.</div>
          ) : (
            <div className="gt-log-list">
              {selectedDay.exercises.map((ex) => {
                const lastSets = getLastSetsForExercise(ex.name);
                const lastText = lastSets
                  ? `Last: ${lastSets.map((s) => `${s.weight}×${s.reps}`).join(", ")}`
                  : "No history yet";
                const sets = draft[ex.id] || [{ reps: "", weight: "" }];
                return (
                  <div className="gt-log-card" key={ex.id}>
                    <div className="gt-log-card-head">
                      <span className="gt-ex-title">{ex.name}</span>
                      <span className="gt-last-hint">{lastText}</span>
                    </div>
                    <div className="gt-set-list">
                      <div className="gt-set-labels">
                        <span>SET</span>
                        <span>WEIGHT</span>
                        <span>REPS</span>
                        <span></span>
                      </div>
                      {sets.map((s, i) => (
                        <div className="gt-set-row" key={i}>
                          <span className="gt-set-num">{i + 1}</span>
                          <input
                            className="gt-num-input"
                            type="number"
                            inputMode="decimal"
                            placeholder="lb"
                            value={s.weight}
                            onChange={(e) => updateSet(ex.id, i, "weight", e.target.value)}
                          />
                          <input
                            className="gt-num-input"
                            type="number"
                            inputMode="numeric"
                            placeholder="reps"
                            value={s.reps}
                            onChange={(e) => updateSet(ex.id, i, "reps", e.target.value)}
                          />
                          <button className="gt-icon-btn gt-icon-danger" onClick={() => removeSet(ex.id, i)}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button className="gt-add-btn" onClick={() => addSet(ex.id)}>
                      <Plus size={14} /> Add set
                    </button>
                  </div>
                );
              })}
              <button className="gt-save-btn" onClick={saveWorkout}>
                <Flame size={18} /> Log Workout for {activePerson}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProgressTab(props) {
  const {
    activePerson, bwInput, setBwInput, logBodyweight, bodyweightData, overallData,
    allExerciseNames, selectedExName, setSelectedExName, exerciseData,
    allDayNames, selectedDayName, setSelectedDayName, dayVolumeData,
  } = props;

  return (
    <div className="gt-tab">
      <h1 className="gt-h1">{activePerson}'s Progress</h1>

      <section className="gt-card">
        <div className="gt-card-head">
          <Flame size={16} />
          <span>Overall Fitness Score</span>
        </div>
        <p className="gt-card-sub">Total volume (weight × reps) lifted per session</p>
        <ChartOrEmpty data={overallData}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={overallData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gt-line)" />
              <XAxis dataKey="date" stroke="var(--gt-text-dim)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--gt-text-dim)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="score" stroke="var(--gt-accent)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </section>

      <section className="gt-card">
        <div className="gt-card-head">
          <TrendingUp size={16} />
          <span>Exercise Progress</span>
        </div>
        <select className="gt-select" value={selectedExName || ""} onChange={(e) => setSelectedExName(e.target.value)}>
          {allExerciseNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <p className="gt-card-sub">Top weight moved per session — stays even if the exercise is later removed from a split</p>
        <ChartOrEmpty data={exerciseData}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={exerciseData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gt-line)" />
              <XAxis dataKey="date" stroke="var(--gt-text-dim)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--gt-text-dim)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="weight" stroke="var(--gt-accent-2)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </section>

      <section className="gt-card">
        <div className="gt-card-head">
          <Dumbbell size={16} />
          <span>Day-over-Day Volume</span>
        </div>
        <select className="gt-select" value={selectedDayName || ""} onChange={(e) => setSelectedDayName(e.target.value)}>
          {allDayNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <p className="gt-card-sub">Total volume per session for this day, so you can see if you moved more than last time</p>
        <ChartOrEmpty data={dayVolumeData}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dayVolumeData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gt-line)" />
              <XAxis dataKey="date" stroke="var(--gt-text-dim)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--gt-text-dim)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="volume" stroke="var(--gt-warn)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </section>

      <section className="gt-card">
        <div className="gt-card-head">
          <Scale size={16} />
          <span>Body Weight</span>
        </div>
        <div className="gt-bw-input-row">
          <input
            className="gt-num-input gt-bw-input"
            type="number"
            inputMode="decimal"
            placeholder="lb today"
            value={bwInput}
            onChange={(e) => setBwInput(e.target.value)}
          />
          <button className="gt-add-btn gt-bw-btn" onClick={logBodyweight}>
            <Plus size={14} /> Log
          </button>
        </div>
        <ChartOrEmpty data={bodyweightData}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={bodyweightData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gt-line)" />
              <XAxis dataKey="date" stroke="var(--gt-text-dim)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--gt-text-dim)" fontSize={11} domain={["auto", "auto"]} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="weight" stroke="var(--gt-good)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartOrEmpty>
      </section>
    </div>
  );
}

function ChartOrEmpty({ data, children }) {
  if (!data || data.length === 0) {
    return <div className="gt-empty gt-empty-chart">Log a few sessions to see this graph fill in.</div>;
  }
  return children;
}

const tooltipStyle = {
  background: "#1E2024",
  border: "1px solid #33363D",
  borderRadius: 8,
  fontSize: 12,
  color: "#ECE8DD",
};

function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');

      .gt-app {
        --gt-bg: #15161A;
        --gt-surface: #1E2024;
        --gt-surface-2: #262930;
        --gt-text: #ECE8DD;
        --gt-text-dim: #8A8D93;
        --gt-accent: #C1443D;
        --gt-accent-2: #5B8C7B;
        --gt-good: #6FA97A;
        --gt-warn: #D9A441;
        --gt-line: #33363D;

        font-family: 'Inter', sans-serif;
        background: var(--gt-bg);
        color: var(--gt-text);
        max-width: 480px;
        margin: 0 auto;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .gt-loading { align-items: center; justify-content: center; }
      .gt-spinner {
        width: 28px; height: 28px; border-radius: 50%;
        border: 3px solid var(--gt-line); border-top-color: var(--gt-accent);
        animation: gt-spin 0.8s linear infinite;
      }
      @keyframes gt-spin { to { transform: rotate(360deg); } }

      .gt-whoami {
        display: flex; flex-direction: column; align-items: center; gap: 14px;
        padding: 30px;
      }
      .gt-whoami-sub { font-family: 'Oswald', sans-serif; font-size: 16px; color: var(--gt-text-dim); margin: 0; }
      .gt-whoami-btns { display: flex; gap: 12px; margin-top: 6px; }
      .gt-whoami-btn {
        background: var(--gt-surface); border: 1px solid var(--gt-line);
        color: var(--gt-text); border-radius: 12px; padding: 16px 26px;
        font-family: 'Oswald', sans-serif; font-size: 16px; font-weight: 600;
      }
      .gt-whoami-btn:active { background: var(--gt-accent); border-color: var(--gt-accent); color: #fff; }
      .gt-whoami-note { font-size: 11px; color: var(--gt-text-dim); margin-top: 8px; }

      .gt-header {
        padding: 16px 18px 12px;
        border-bottom: 1px solid var(--gt-line);
        position: sticky; top: 0; background: var(--gt-bg); z-index: 5;
        display: flex; flex-direction: column; gap: 10px;
      }
      .gt-header-title {
        font-family: 'Oswald', sans-serif;
        font-weight: 700;
        font-size: 20px;
        letter-spacing: 0.08em;
        display: flex; align-items: center; gap: 8px;
        color: var(--gt-text);
      }
      .gt-header-title svg { color: var(--gt-accent); }

      .gt-person-switch {
        display: flex; background: var(--gt-surface-2); border-radius: 10px; padding: 3px; gap: 3px;
      }
      .gt-person-btn {
        flex: 1; background: transparent; border: none; color: var(--gt-text-dim);
        padding: 8px; border-radius: 8px; font-size: 13px; font-weight: 700;
        font-family: 'Oswald', sans-serif; letter-spacing: 0.03em;
      }
      .gt-person-btn.active { background: var(--gt-accent); color: #fff; }

      .gt-shared-note {
        display: flex; align-items: center; gap: 5px;
        font-size: 10px; color: var(--gt-text-dim); letter-spacing: 0.01em;
      }

      .gt-banner {
        margin: 10px 14px 0;
        padding: 10px 12px;
        border-radius: 10px;
        font-size: 13px;
        display: flex; align-items: center; justify-content: space-between;
        gap: 8px;
        cursor: pointer;
      }
      .gt-banner-good { background: rgba(111,169,122,0.15); color: var(--gt-good); border: 1px solid rgba(111,169,122,0.35); }
      .gt-banner-warn { background: rgba(217,164,65,0.15); color: var(--gt-warn); border: 1px solid rgba(217,164,65,0.35); }

      .gt-main { flex: 1; overflow-y: auto; padding: 14px 14px 90px; }
      .gt-tab { display: flex; flex-direction: column; gap: 14px; }

      .gt-h1 {
        font-family: 'Oswald', sans-serif;
        font-size: 22px;
        font-weight: 600;
        letter-spacing: 0.02em;
        margin: 4px 0;
      }
      .gt-row-between { display: flex; align-items: center; justify-content: space-between; }

      .gt-edit-toggle {
        display: flex; align-items: center; gap: 6px;
        background: var(--gt-surface); border: 1px solid var(--gt-line);
        color: var(--gt-text-dim); border-radius: 20px;
        padding: 7px 14px; font-size: 12px; font-weight: 600;
        letter-spacing: 0.03em;
      }
      .gt-edit-toggle.active { background: var(--gt-accent); color: #fff; border-color: var(--gt-accent); }

      .gt-split-picker { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; align-items: center; }
      .gt-split-chip {
        flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
        background: var(--gt-surface); border: 1px solid var(--gt-line);
        color: var(--gt-text-dim); border-radius: 14px;
        padding: 8px 14px;
      }
      .gt-split-chip.active { background: var(--gt-accent); border-color: var(--gt-accent); }
      .gt-split-chip.active .gt-split-chip-name,
      .gt-split-chip.active .gt-split-chip-owner { color: #fff; }
      .gt-split-chip-name { font-family: 'Oswald', sans-serif; font-size: 13px; font-weight: 600; color: var(--gt-text); }
      .gt-split-chip-owner { font-size: 9px; color: var(--gt-text-dim); letter-spacing: 0.03em; }
      .gt-split-chip-new {
        flex-direction: row; align-items: center; gap: 4px;
        border-style: dashed; color: var(--gt-accent); border-color: var(--gt-accent);
        font-size: 12px; font-weight: 600;
      }
      .gt-new-split-form { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
      .gt-new-split-form .gt-input { width: 130px; }

      .gt-split-name-row { display: flex; align-items: center; gap: 8px; }
      .gt-split-title-input { flex: 1; font-family: 'Oswald', sans-serif; font-size: 17px; font-weight: 600; }
      .gt-confirm-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--gt-text-dim); }

      .gt-day-picker { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
      .gt-day-chip {
        flex-shrink: 0;
        background: var(--gt-surface); border: 1px solid var(--gt-line);
        color: var(--gt-text-dim); border-radius: 20px;
        padding: 9px 18px; font-size: 14px; font-weight: 600;
        font-family: 'Oswald', sans-serif; letter-spacing: 0.03em;
      }
      .gt-day-chip.active { background: var(--gt-accent); color: #fff; border-color: var(--gt-accent); }

      .gt-editor { display: flex; flex-direction: column; gap: 12px; }
      .gt-day-card, .gt-log-card, .gt-card {
        background: var(--gt-surface);
        border: 1px solid var(--gt-line);
        border-radius: 14px;
        padding: 14px;
      }
      .gt-day-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
      .gt-day-name { font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 16px; flex: 1; }
      .gt-icon-row { display: flex; gap: 4px; flex-shrink: 0; }
      .gt-icon-btn {
        width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
        background: var(--gt-surface-2); border: 1px solid var(--gt-line);
        border-radius: 8px; color: var(--gt-text-dim);
      }
      .gt-icon-btn:disabled { opacity: 0.3; }
      .gt-icon-danger { color: var(--gt-accent); }

      .gt-ex-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
      .gt-ex-row { display: flex; align-items: center; gap: 8px; }
      .gt-ex-name { flex: 1; font-size: 14px; }

      .gt-input {
        background: var(--gt-surface-2); border: 1px solid var(--gt-line);
        color: var(--gt-text); border-radius: 8px; padding: 8px 10px;
        font-family: inherit;
      }
      .gt-input:focus { outline: none; border-color: var(--gt-accent); }

      .gt-add-btn {
        display: flex; align-items: center; justify-content: center; gap: 6px;
        width: 100%; padding: 10px; border-radius: 10px;
        background: transparent; border: 1px dashed var(--gt-line);
        color: var(--gt-text-dim); font-size: 13px; font-weight: 600;
      }
      .gt-add-day { border-color: var(--gt-accent); color: var(--gt-accent); }

      .gt-empty {
        text-align: center; color: var(--gt-text-dim); font-size: 13px;
        padding: 30px 16px; border: 1px dashed var(--gt-line); border-radius: 12px;
      }
      .gt-empty-chart { padding: 40px 16px; }

      .gt-log-list { display: flex; flex-direction: column; gap: 12px; }
      .gt-log-card-head { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }
      .gt-ex-title { font-family: 'Oswald', sans-serif; font-size: 16px; font-weight: 600; }
      .gt-last-hint { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--gt-text-dim); }

      .gt-set-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
      .gt-set-labels {
        display: grid; grid-template-columns: 28px 1fr 1fr 30px; gap: 6px;
        font-size: 10px; color: var(--gt-text-dim); letter-spacing: 0.05em;
        padding: 0 2px;
      }
      .gt-set-row {
        display: grid; grid-template-columns: 28px 1fr 1fr 30px; gap: 6px; align-items: center;
      }
      .gt-set-num {
        font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--gt-text-dim);
        text-align: center;
      }
      .gt-num-input {
        background: var(--gt-surface-2); border: 1px solid var(--gt-line);
        color: var(--gt-text); border-radius: 8px; padding: 10px 8px;
        font-family: 'JetBrains Mono', monospace; font-size: 15px; text-align: center;
        width: 100%;
      }
      .gt-num-input:focus { outline: none; border-color: var(--gt-accent); }
      .gt-num-input::-webkit-outer-spin-button, .gt-num-input::-webkit-inner-spin-button {
        -webkit-appearance: none; margin: 0;
      }

      .gt-save-btn {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        background: var(--gt-accent); color: #fff; border: none;
        border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 700;
        font-family: 'Oswald', sans-serif; letter-spacing: 0.04em;
        margin-top: 4px;
      }

      .gt-card-head {
        display: flex; align-items: center; gap: 8px;
        font-family: 'Oswald', sans-serif; font-size: 14px; font-weight: 600;
        letter-spacing: 0.03em; color: var(--gt-text);
      }
      .gt-card-head svg { color: var(--gt-accent); }
      .gt-card-sub { font-size: 11px; color: var(--gt-text-dim); margin: 4px 0 10px; }

      .gt-select {
        background: var(--gt-surface-2); border: 1px solid var(--gt-line);
        color: var(--gt-text); border-radius: 8px; padding: 8px 10px;
        font-size: 13px; margin-bottom: 4px; width: 100%;
      }

      .gt-bw-input-row { display: flex; gap: 8px; margin-bottom: 12px; }
      .gt-bw-input { flex: 1; }
      .gt-bw-btn { width: auto; padding: 10px 16px; flex-shrink: 0; }

      .gt-nav {
        position: sticky; bottom: 0; left: 0; right: 0;
        display: flex; background: var(--gt-surface);
        border-top: 1px solid var(--gt-line);
        padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
        max-width: 480px; margin: 0 auto; width: 100%;
      }
      .gt-nav-btn {
        flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
        background: transparent; border: none; color: var(--gt-text-dim);
        padding: 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
      }
      .gt-nav-btn.active { color: var(--gt-accent); }

      input[type=number] { -moz-appearance: textfield; }

      @media (min-width: 480px) {
        .gt-app { border-left: 1px solid var(--gt-line); border-right: 1px solid var(--gt-line); }
      }
    `}</style>
  );
}
