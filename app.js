(() => {
  "use strict";

  const STORAGE_KEY = "dayflow-planner-v1";
  const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];

  const defaultState = {
    checklist: [],
    schedule: [],
    meals: [],
    workouts: [],
    activeSection: "overview",
    taskFilter: "all"
  };

  let state = loadState();

  const elements = {
    currentDate: document.querySelector("#currentDate"),
    pageTitle: document.querySelector("#pageTitle"),
    saveStatus: document.querySelector("#saveStatus"),
    progressRing: document.querySelector("#progressRing"),
    progressPercent: document.querySelector("#progressPercent"),
    progressText: document.querySelector("#progressText"),
    openTaskCount: document.querySelector("#openTaskCount"),
    scheduleCount: document.querySelector("#scheduleCount"),
    calorieCount: document.querySelector("#calorieCount"),
    workoutDayCount: document.querySelector("#workoutDayCount"),
    overviewTaskList: document.querySelector("#overviewTaskList"),
    overviewScheduleList: document.querySelector(
      "#overviewScheduleList"
    ),
    quickTaskForm: document.querySelector("#quickTaskForm"),
    quickTaskInput: document.querySelector("#quickTaskInput"),
    taskForm: document.querySelector("#taskForm"),
    taskInput: document.querySelector("#taskInput"),
    taskCategory: document.querySelector("#taskCategory"),
    taskPriority: document.querySelector("#taskPriority"),
    taskList: document.querySelector("#taskList"),
    clearCompletedButton: document.querySelector(
      "#clearCompletedButton"
    ),
    scheduleForm: document.querySelector("#scheduleForm"),
    scheduleDate: document.querySelector("#scheduleDate"),
    startTime: document.querySelector("#startTime"),
    endTime: document.querySelector("#endTime"),
    scheduleActivity: document.querySelector(
      "#scheduleActivity"
    ),
    scheduleMessage: document.querySelector(
      "#scheduleMessage"
    ),
    scheduleFilterDate: document.querySelector(
      "#scheduleFilterDate"
    ),
    scheduleDayTitle: document.querySelector(
      "#scheduleDayTitle"
    ),
    scheduleList: document.querySelector("#scheduleList"),
    mealForm: document.querySelector("#mealForm"),
    mealDate: document.querySelector("#mealDate"),
    mealType: document.querySelector("#mealType"),
    foodName: document.querySelector("#foodName"),
    calories: document.querySelector("#calories"),
    protein: document.querySelector("#protein"),
    carbs: document.querySelector("#carbs"),
    fat: document.querySelector("#fat"),
    mealFilterDate: document.querySelector(
      "#mealFilterDate"
    ),
    mealDayTitle: document.querySelector("#mealDayTitle"),
    mealList: document.querySelector("#mealList"),
    totalCalories: document.querySelector("#totalCalories"),
    totalProtein: document.querySelector("#totalProtein"),
    totalCarbs: document.querySelector("#totalCarbs"),
    totalFat: document.querySelector("#totalFat"),
    workoutForm: document.querySelector("#workoutForm"),
    workoutDay: document.querySelector("#workoutDay"),
    workoutTitle: document.querySelector("#workoutTitle"),
    workoutDuration: document.querySelector(
      "#workoutDuration"
    ),
    workoutNotes: document.querySelector("#workoutNotes"),
    workoutWeek: document.querySelector("#workoutWeek"),
    exportButton: document.querySelector("#exportButton"),
    importInput: document.querySelector("#importInput"),
    resetAllButton: document.querySelector("#resetAllButton"),
    emptyStateTemplate: document.querySelector(
      "#emptyStateTemplate"
    )
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return structuredCloneSafe(defaultState);
      }

      const parsed = JSON.parse(saved);

      return {
        ...structuredCloneSafe(defaultState),
        ...parsed,

        checklist: Array.isArray(parsed.checklist)
          ? parsed.checklist
          : [],

        schedule: Array.isArray(parsed.schedule)
          ? parsed.schedule
          : [],

        meals: Array.isArray(parsed.meals)
          ? parsed.meals
          : [],

        workouts: Array.isArray(parsed.workouts)
          ? parsed.workouts
          : []
      };
    } catch (error) {
      console.warn(
        "Could not load saved planner data.",
        error
      );

      return structuredCloneSafe(defaultState);
    }
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function saveState() {
    elements.saveStatus.classList.add("saving");
    elements.saveStatus.lastChild.textContent = " Saving";

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

      window.setTimeout(() => {
        elements.saveStatus.classList.remove("saving");
        elements.saveStatus.lastChild.textContent =
          " Saved";
      }, 220);
    } catch (error) {
      console.error(
        "Could not save planner data.",
        error
      );

      elements.saveStatus.lastChild.textContent =
        " Save failed";
    }
  }

  function makeId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
  }

  function todayISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset();

    return new Date(
      now.getTime() - offset * 60_000
    )
      .toISOString()
      .slice(0, 10);
  }

  function formatLongDate(isoDate) {
    const date = new Date(`${isoDate}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
      return isoDate;
    }

    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    }).format(date);
  }

  function formatTime(time) {
    if (!time) {
      return "";
    }

    const [hours, minutes] = time
      .split(":")
      .map(Number);

    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function numberOrZero(value) {
    const number = Number(value);

    return Number.isFinite(number) && number >= 0
      ? number
      : 0;
  }

  function emptyState() {
    return elements.emptyStateTemplate.content
      .firstElementChild
      .cloneNode(true);
  }

  function createButton(
    label,
    className,
    onClick
  ) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = "×";

    button.addEventListener("click", onClick);

    return button;
  }

  function setSection(sectionId) {
    const target = document.getElementById(sectionId);

    if (!target) {
      return;
    }

    document
      .querySelectorAll(".page-section")
      .forEach((section) => {
        section.classList.toggle(
          "active",
          section.id === sectionId
        );
      });

    document
      .querySelectorAll(".nav-button")
      .forEach((button) => {
        const isActive =
          button.dataset.section === sectionId;

        button.classList.toggle(
          "active",
          isActive
        );

        if (isActive) {
          button.setAttribute(
            "aria-current",
            "page"
          );
        } else {
          button.removeAttribute("aria-current");
        }
      });

    const activeButton = document.querySelector(
      `.nav-button[data-section="${sectionId}"]`
    );

    elements.pageTitle.textContent = activeButton
      ? activeButton.textContent.trim()
      : "DayFlow";

    state.activeSection = sectionId;

    saveState();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function addTask(
    text,
    category = "Personal",
    priority = "normal"
  ) {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    state.checklist.unshift({
      id: makeId(),
      text: cleanText,
      category,
      priority,
      completed: false,
      createdAt: new Date().toISOString()
    });

    saveState();
    renderAll();
  }

  function toggleTask(id) {
    const task = state.checklist.find(
      (item) => item.id === id
    );

    if (!task) {
      return;
    }

    task.completed = !task.completed;

    saveState();
    renderAll();
  }

  function deleteTask(id) {
    state.checklist = state.checklist.filter(
      (item) => item.id !== id
    );

    saveState();
    renderAll();
  }

  function renderOverview() {
    const total = state.checklist.length;

    const completed = state.checklist.filter(
      (item) => item.completed
    ).length;

    const open = total - completed;

    const percent = total
      ? Math.round((completed / total) * 100)
      : 0;

    const today = todayISO();

    const todaySchedule = state.schedule.filter(
      (item) => item.date === today
    );

    const todayMeals = state.meals.filter(
      (item) => item.date === today
    );

    const plannedCalories = todayMeals.reduce(
      (sum, item) =>
        sum + numberOrZero(item.calories),
      0
    );

    const workoutDays = new Set(
      state.workouts.map((item) => item.day)
    ).size;

    elements.progressPercent.textContent =
      `${percent}%`;

    elements.progressText.textContent = total
      ? `${completed} of ${total} completed`
      : "No tasks added yet";

    elements.progressRing.style.setProperty(
      "--progress",
      `${percent * 3.6}deg`
    );

    elements.openTaskCount.textContent =
      String(open);

    elements.scheduleCount.textContent =
      String(todaySchedule.length);

    elements.calorieCount.textContent =
      String(Math.round(plannedCalories));

    elements.workoutDayCount.textContent =
      String(workoutDays);

    elements.overviewTaskList.replaceChildren();

    const recentTasks = state.checklist.slice(0, 4);

    if (!recentTasks.length) {
      elements.overviewTaskList.append(
        emptyState()
      );
    } else {
      recentTasks.forEach((task) => {
        const row =
          document.createElement("div");

        row.className =
          `mini-item${task.completed ? " done" : ""}`;

        const checkbox =
          document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.className = "mini-check";
        checkbox.checked = task.completed;

        checkbox.setAttribute(
          "aria-label",
          `Mark ${task.text} as ${
            task.completed ? "open" : "complete"
          }`
        );

        checkbox.addEventListener(
          "change",
          () => toggleTask(task.id)
        );

        const label =
          document.createElement("label");

        label.textContent = task.text;

        row.append(checkbox, label);

        elements.overviewTaskList.append(row);
      });
    }

    elements.overviewScheduleList
      .replaceChildren();

    const upcoming = [...todaySchedule]
      .sort((a, b) =>
        a.start.localeCompare(b.start)
      )
      .slice(0, 4);

    if (!upcoming.length) {
      elements.overviewScheduleList.append(
        emptyState()
      );
    } else {
      upcoming.forEach((item) => {
        const row =
          document.createElement("div");

        row.className =
          "timeline-preview-item";

        const time =
          document.createElement("time");

        time.textContent =
          formatTime(item.start);

        const text =
          document.createElement("p");

        text.textContent = item.activity;

        row.append(time, text);

        elements.overviewScheduleList.append(
          row
        );
      });
    }
  }

  function renderTasks() {
    elements.taskList.replaceChildren();

    const filtered = state.checklist.filter(
      (task) => {
        if (state.taskFilter === "open") {
          return !task.completed;
        }

        if (state.taskFilter === "done") {
          return task.completed;
        }

        return true;
      }
    );

    if (!filtered.length) {
      elements.taskList.append(emptyState());
      return;
    }

    filtered.forEach((task) => {
      const item =
        document.createElement("div");

      item.className =
        `task-item${task.completed ? " done" : ""}`;

      const checkbox =
        document.createElement("input");

      checkbox.type = "checkbox";
      checkbox.className = "task-checkbox";
      checkbox.checked = task.completed;

      checkbox.setAttribute(
        "aria-label",
        `Mark ${task.text} as ${
          task.completed ? "open" : "complete"
        }`
      );

      checkbox.addEventListener(
        "change",
        () => toggleTask(task.id)
      );

      const main =
        document.createElement("div");

      main.className = "item-main";

      const title =
        document.createElement("span");

      title.className = "item-title";
      title.textContent = task.text;

      const meta =
        document.createElement("div");

      meta.className = "item-meta";

      const category =
        document.createElement("span");

      category.className = "badge";
      category.textContent = task.category;

      const priority =
        document.createElement("span");

      priority.className =
        `badge priority-${task.priority}`;

      priority.textContent =
        `${task.priority[0].toUpperCase()}` +
        `${task.priority.slice(1)} priority`;

      meta.append(category, priority);
      main.append(title, meta);

      const remove = createButton(
        `Delete ${task.text}`,
        "delete-button",
        () => deleteTask(task.id)
      );

      item.append(
        checkbox,
        main,
        remove
      );

      elements.taskList.append(item);
    });
  }

  function addScheduleItem(event) {
    event.preventDefault();

    elements.scheduleMessage.textContent = "";

    const date =
      elements.scheduleDate.value;

    const start =
      elements.startTime.value;

    const end =
      elements.endTime.value;

    const activity =
      elements.scheduleActivity.value.trim();

    if (
      !date ||
      !start ||
      !end ||
      !activity
    ) {
      return;
    }

    if (end <= start) {
      elements.scheduleMessage.textContent =
        "The finish time must be later than the start time.";

      return;
    }

    state.schedule.push({
      id: makeId(),
      date,
      start,
      end,
      activity,
      createdAt: new Date().toISOString()
    });

    state.schedule.sort((a, b) =>
      `${a.date}-${a.start}`.localeCompare(
        `${b.date}-${b.start}`
      )
    );

    elements.scheduleFilterDate.value =
      date;

    elements.scheduleActivity.value = "";

    saveState();
    renderAll();
  }

  function renderSchedule() {
    const selectedDate =
      elements.scheduleFilterDate.value ||
      todayISO();

    elements.scheduleDayTitle.textContent =
      formatLongDate(selectedDate);

    elements.scheduleList.replaceChildren();

    const items = state.schedule
      .filter(
        (item) => item.date === selectedDate
      )
      .sort((a, b) =>
        a.start.localeCompare(b.start)
      );

    if (!items.length) {
      elements.scheduleList.append(
        emptyState()
      );

      return;
    }

    items.forEach((block) => {
      const item =
        document.createElement("div");

      item.className = "schedule-item";

      const time =
        document.createElement("div");

      time.className = "time-block";

      const start =
        document.createElement("strong");

      start.textContent =
        formatTime(block.start);

      const end =
        document.createElement("small");

      end.textContent =
        `to ${formatTime(block.end)}`;

      time.append(start, end);

      const main =
        document.createElement("div");

      main.className = "item-main";

      const title =
        document.createElement("span");

      title.className = "item-title";
      title.textContent = block.activity;

      main.append(title);

      const remove = createButton(
        `Delete ${block.activity}`,
        "delete-button",
        () => {
          state.schedule =
            state.schedule.filter(
              (entry) =>
                entry.id !== block.id
            );

          saveState();
          renderAll();
        }
      );

      item.append(
        time,
        main,
        remove
      );

      elements.scheduleList.append(item);
    });
  }

  function addMeal(event) {
    event.preventDefault();

    const date =
      elements.mealDate.value;

    const type =
      elements.mealType.value;

    const food =
      elements.foodName.value.trim();

    if (!date || !food) {
      return;
    }

    state.meals.push({
      id: makeId(),
      date,
      type,
      food,

      calories: numberOrZero(
        elements.calories.value
      ),

      protein: numberOrZero(
        elements.protein.value
      ),

      carbs: numberOrZero(
        elements.carbs.value
      ),

      fat: numberOrZero(
        elements.fat.value
      ),

      createdAt: new Date().toISOString()
    });

    elements.mealFilterDate.value = date;
    elements.foodName.value = "";
    elements.calories.value = "";
    elements.protein.value = "";
    elements.carbs.value = "";
    elements.fat.value = "";

    saveState();
    renderAll();
  }

  function renderMeals() {
    const selectedDate =
      elements.mealFilterDate.value ||
      todayISO();

    elements.mealDayTitle.textContent =
      formatLongDate(selectedDate);

    elements.mealList.replaceChildren();

    const order = {
      Breakfast: 0,
      Lunch: 1,
      Dinner: 2,
      Snack: 3
    };

    const items = state.meals
      .filter(
        (item) => item.date === selectedDate
      )
      .sort(
        (a, b) =>
          (order[a.type] ?? 9) -
          (order[b.type] ?? 9)
      );

    const totals = items.reduce(
      (sum, item) => ({
        calories:
          sum.calories +
          numberOrZero(item.calories),

        protein:
          sum.protein +
          numberOrZero(item.protein),

        carbs:
          sum.carbs +
          numberOrZero(item.carbs),

        fat:
          sum.fat +
          numberOrZero(item.fat)
      }),

      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      }
    );

    elements.totalCalories.textContent =
      String(Math.round(totals.calories));

    elements.totalProtein.textContent =
      totals.protein
        .toFixed(1)
        .replace(".0", "");

    elements.totalCarbs.textContent =
      totals.carbs
        .toFixed(1)
        .replace(".0", "");

    elements.totalFat.textContent =
      totals.fat
        .toFixed(1)
        .replace(".0", "");

    if (!items.length) {
      elements.mealList.append(emptyState());
      return;
    }

    items.forEach((meal) => {
      const item =
        document.createElement("div");

      item.className = "meal-item";

      const type =
        document.createElement("span");

      type.className = "meal-type";
      type.textContent = meal.type;

      const main =
        document.createElement("div");

      main.className = "item-main";

      const title =
        document.createElement("span");

      title.className = "item-title";
      title.textContent = meal.food;

      const macros =
        document.createElement("div");

      macros.className = "macro-line";

      [
        `${Math.round(
          numberOrZero(meal.calories)
        )} kcal`,

        `${numberOrZero(
          meal.protein
        )}g protein`,

        `${numberOrZero(
          meal.carbs
        )}g carbs`,

        `${numberOrZero(
          meal.fat
        )}g fat`
      ].forEach((value) => {
        const span =
          document.createElement("span");

        span.textContent = value;
        macros.append(span);
      });

      main.append(title, macros);

      const remove = createButton(
        `Delete ${meal.food}`,
        "delete-button",
        () => {
          state.meals =
            state.meals.filter(
              (entry) =>
                entry.id !== meal.id
            );

          saveState();
          renderAll();
        }
      );

      item.append(
        type,
        main,
        remove
      );

      elements.mealList.append(item);
    });
  }

  function addWorkout(event) {
    event.preventDefault();

    const title =
      elements.workoutTitle.value.trim();

    if (!title) {
      return;
    }

    state.workouts.push({
      id: makeId(),

      day:
        elements.workoutDay.value,

      title,

      duration: numberOrZero(
        elements.workoutDuration.value
      ),

      notes:
        elements.workoutNotes.value.trim(),

      createdAt: new Date().toISOString()
    });

    elements.workoutTitle.value = "";
    elements.workoutDuration.value = "";
    elements.workoutNotes.value = "";

    saveState();
    renderAll();
  }

  function renderWorkouts() {
    elements.workoutWeek.replaceChildren();

    const currentDay =
      new Intl.DateTimeFormat(
        "en-US",
        {
          weekday: "long"
        }
      ).format(new Date());

    DAYS.forEach((day) => {
      const card =
        document.createElement("article");

      card.className =
        `day-card${
          day === currentDay
            ? " today"
            : ""
        }`;

      const header =
        document.createElement("div");

      header.className =
        "day-card-header";

      const heading =
        document.createElement("h3");

      heading.textContent = day;

      header.append(heading);

      if (day === currentDay) {
        const today =
          document.createElement("span");

        today.className = "today-label";
        today.textContent = "Today";

        header.append(today);
      }

      card.append(header);

      const workouts =
        state.workouts.filter(
          (item) => item.day === day
        );

      if (!workouts.length) {
        const empty =
          document.createElement("div");

        empty.className = "day-empty";

        empty.textContent =
          "Rest day or no workout planned.";

        card.append(empty);
      } else {
        workouts.forEach((workout) => {
          const entry =
            document.createElement("div");

          entry.className =
            "workout-entry";

          const title =
            document.createElement("strong");

          title.textContent =
            workout.title;

          entry.append(title);

          if (workout.duration) {
            const duration =
              document.createElement("small");

            duration.textContent =
              `${workout.duration} minutes`;

            entry.append(duration);
          }

          if (workout.notes) {
            const notes =
              document.createElement("p");

            notes.textContent =
              workout.notes;

            entry.append(notes);
          }

          const remove = createButton(
            `Delete ${workout.title}`,
            "delete-button",
            () => {
              state.workouts =
                state.workouts.filter(
                  (item) =>
                    item.id !== workout.id
                );

              saveState();
              renderAll();
            }
          );

          entry.append(remove);
          card.append(entry);
        });
      }

      elements.workoutWeek.append(card);
    });
  }

  function renderAll() {
    renderOverview();
    renderTasks();
    renderSchedule();
    renderMeals();
    renderWorkouts();
  }

  function exportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          state,
          null,
          2
        )
      ],
      {
        type: "application/json"
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `dayflow-backup-${todayISO()}.json`;

    document.body.append(link);

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function importData(file) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();

      const parsed =
        JSON.parse(text);

      if (
        !parsed ||
        typeof parsed !== "object"
      ) {
        throw new Error("Invalid file");
      }

      state = {
        ...structuredCloneSafe(defaultState),
        ...parsed,

        checklist:
          Array.isArray(parsed.checklist)
            ? parsed.checklist
            : [],

        schedule:
          Array.isArray(parsed.schedule)
            ? parsed.schedule
            : [],

        meals:
          Array.isArray(parsed.meals)
            ? parsed.meals
            : [],

        workouts:
          Array.isArray(parsed.workouts)
            ? parsed.workouts
            : []
      };

      saveState();

      setSection(
        state.activeSection ||
        "overview"
      );

      renderAll();

      window.alert(
        "Planner data imported successfully."
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "That file could not be imported. Choose a DayFlow JSON backup."
      );
    } finally {
      elements.importInput.value = "";
    }
  }

  function resetAllData() {
    const confirmed = window.confirm(
      "Delete every saved task, time block, meal, and workout from this browser?"
    );

    if (!confirmed) {
      return;
    }

    state =
      structuredCloneSafe(defaultState);

    localStorage.removeItem(STORAGE_KEY);

    setInitialDates();
    setSection("overview");
    renderAll();
  }

  function setInitialDates() {
    const today = todayISO();

    elements.currentDate.textContent =
      formatLongDate(today);

    elements.scheduleDate.value =
      today;

    elements.scheduleFilterDate.value =
      today;

    elements.mealDate.value =
      today;

    elements.mealFilterDate.value =
      today;
  }

  function bindEvents() {
    document
      .querySelectorAll(".nav-button")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () =>
            setSection(
              button.dataset.section
            )
        );
      });

    document
      .querySelectorAll("[data-go-to]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () =>
            setSection(
              button.dataset.goTo
            )
        );
      });

    elements.quickTaskForm.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        addTask(
          elements.quickTaskInput.value
        );

        elements.quickTaskInput.value = "";
      }
    );

    elements.taskForm.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        addTask(
          elements.taskInput.value,
          elements.taskCategory.value,
          elements.taskPriority.value
        );

        elements.taskInput.value = "";
        elements.taskInput.focus();
      }
    );

    document
      .querySelectorAll(".filter-button")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            state.taskFilter =
              button.dataset.filter;

            document
              .querySelectorAll(
                ".filter-button"
              )
              .forEach((item) => {
                item.classList.toggle(
                  "active",
                  item === button
                );
              });

            saveState();
            renderTasks();
          }
        );
      });

    elements.clearCompletedButton
      .addEventListener(
        "click",
        () => {
          state.checklist =
            state.checklist.filter(
              (task) =>
                !task.completed
            );

          saveState();
          renderAll();
        }
      );

    elements.scheduleForm
      .addEventListener(
        "submit",
        addScheduleItem
      );

    elements.scheduleFilterDate
      .addEventListener(
        "change",
        renderSchedule
      );

    elements.mealForm
      .addEventListener(
        "submit",
        addMeal
      );

    elements.mealFilterDate
      .addEventListener(
        "change",
        renderMeals
      );

    elements.workoutForm
      .addEventListener(
        "submit",
        addWorkout
      );

    elements.exportButton
      .addEventListener(
        "click",
        exportData
      );

    elements.importInput
      .addEventListener(
        "change",
        (event) =>
          importData(
            event.target.files[0]
          )
      );

    elements.resetAllButton
      .addEventListener(
        "click",
        resetAllData
      );
  }

  function initialize() {
    setInitialDates();
    bindEvents();

    document
      .querySelectorAll(".filter-button")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.filter ===
            state.taskFilter
        );
      });

    setSection(
      state.activeSection ||
      "overview"
    );

    renderAll();
  }

  initialize();
})();