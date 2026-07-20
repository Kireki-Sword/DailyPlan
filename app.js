(() => {
  'use strict';

  const STORAGE_KEY = 'dayflow-planner-v1';

  const SECTIONS = [
    'overview',
    'checklist',
    'schedule',
    'diet',
    'workout'
  ];

  const SECTION_TITLES = {
    overview: 'Overview',
    checklist: 'Checklist',
    schedule: 'Daily plan',
    diet: 'Diet & macros',
    workout: 'Workout week'
  };

  const WEEK_DAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  const defaultState = () => ({
    version: 1,
    tasks: [],
    schedule: [],
    meals: [],
    workouts: []
  });

  let state = loadState();
  let activeTaskFilter = 'all';
  let saveTimer = null;
  let openCustomSelect = null;

  const customSelects = new Map();

  const $ = (selector, scope = document) => {
    return scope.querySelector(selector);
  };

  const $$ = (selector, scope = document) => {
    return [...scope.querySelectorAll(selector)];
  };

  const els = {
    currentDate: $('#currentDate'),
    pageTitle: $('#pageTitle'),
    saveStatus: $('#saveStatus'),
    exportButton: $('#exportButton'),
    importButton: $('#importButton'),
    importInput: $('#importInput'),

    progressRing: $('#progressRing'),
    progressPercent: $('#progressPercent'),
    progressText: $('#progressText'),
    openTaskCount: $('#openTaskCount'),
    scheduleCount: $('#scheduleCount'),
    calorieCount: $('#calorieCount'),
    workoutDayCount: $('#workoutDayCount'),
    overviewTaskList: $('#overviewTaskList'),
    overviewScheduleList: $('#overviewScheduleList'),

    quickTaskForm: $('#quickTaskForm'),
    quickTaskInput: $('#quickTaskInput'),
    taskForm: $('#taskForm'),
    taskInput: $('#taskInput'),
    taskCategory: $('#taskCategory'),
    taskPriority: $('#taskPriority'),
    taskList: $('#taskList'),
    clearCompletedButton: $('#clearCompletedButton'),

    scheduleForm: $('#scheduleForm'),
    scheduleDate: $('#scheduleDate'),
    startTime: $('#startTime'),
    endTime: $('#endTime'),
    scheduleActivity: $('#scheduleActivity'),
    scheduleMessage: $('#scheduleMessage'),
    scheduleFilterDate: $('#scheduleFilterDate'),
    scheduleDayTitle: $('#scheduleDayTitle'),
    scheduleList: $('#scheduleList'),

    mealForm: $('#mealForm'),
    mealDate: $('#mealDate'),
    mealType: $('#mealType'),
    foodName: $('#foodName'),
    calories: $('#calories'),
    protein: $('#protein'),
    carbs: $('#carbs'),
    fat: $('#fat'),
    mealFilterDate: $('#mealFilterDate'),
    mealDayTitle: $('#mealDayTitle'),
    mealList: $('#mealList'),
    totalCalories: $('#totalCalories'),
    totalProtein: $('#totalProtein'),
    totalCarbs: $('#totalCarbs'),
    totalFat: $('#totalFat'),

    workoutForm: $('#workoutForm'),
    workoutDay: $('#workoutDay'),
    workoutTitle: $('#workoutTitle'),
    workoutDuration: $('#workoutDuration'),
    workoutNotes: $('#workoutNotes'),
    workoutWeek: $('#workoutWeek'),

    resetAllButton: $('#resetAllButton'),
    emptyStateTemplate: $('#emptyStateTemplate')
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return defaultState();
      }

      return normalizeState(JSON.parse(raw));
    } catch (error) {
      console.warn(
        'DayFlow could not load saved data:',
        error
      );

      return defaultState();
    }
  }

  function normalizeState(value) {
    const next = defaultState();

    if (!value || typeof value !== 'object') {
      return next;
    }

    next.tasks = Array.isArray(value.tasks)
      ? value.tasks
          .map(normalizeTask)
          .filter(Boolean)
      : [];

    next.schedule = Array.isArray(value.schedule)
      ? value.schedule
          .map(normalizeScheduleItem)
          .filter(Boolean)
      : [];

    next.meals = Array.isArray(value.meals)
      ? value.meals
          .map(normalizeMeal)
          .filter(Boolean)
      : [];

    next.workouts = Array.isArray(value.workouts)
      ? value.workouts
          .map(normalizeWorkout)
          .filter(Boolean)
      : [];

    return next;
  }

  function normalizeTask(item) {
    if (
      !item ||
      typeof item.text !== 'string' ||
      !item.text.trim()
    ) {
      return null;
    }

    return {
      id: safeId(item.id),

      text: item.text
        .trim()
        .slice(0, 140),

      category:
        typeof item.category === 'string'
          ? item.category.slice(0, 40)
          : 'Personal',

      priority: [
        'low',
        'normal',
        'high'
      ].includes(item.priority)
        ? item.priority
        : 'normal',

      done: Boolean(item.done),

      createdAt: validDateTime(item.createdAt)
        ? item.createdAt
        : new Date().toISOString()
    };
  }

  function normalizeScheduleItem(item) {
    if (
      !item ||
      !validDate(item.date) ||
      !validTime(item.start) ||
      !validTime(item.end) ||
      item.start >= item.end
    ) {
      return null;
    }

    if (
      typeof item.activity !== 'string' ||
      !item.activity.trim()
    ) {
      return null;
    }

    return {
      id: safeId(item.id),

      date: item.date,

      start: item.start,

      end: item.end,

      activity: item.activity
        .trim()
        .slice(0, 160),

      createdAt: validDateTime(item.createdAt)
        ? item.createdAt
        : new Date().toISOString()
    };
  }

  function normalizeMeal(item) {
    if (
      !item ||
      !validDate(item.date) ||
      typeof item.food !== 'string' ||
      !item.food.trim()
    ) {
      return null;
    }

    return {
      id: safeId(item.id),

      date: item.date,

      type:
        typeof item.type === 'string'
          ? item.type.slice(0, 30)
          : 'Meal',

      food: item.food
        .trim()
        .slice(0, 160),

      calories: clampNumber(
        item.calories,
        0,
        10000
      ),

      protein: clampNumber(
        item.protein,
        0,
        1000
      ),

      carbs: clampNumber(
        item.carbs,
        0,
        1000
      ),

      fat: clampNumber(
        item.fat,
        0,
        1000
      ),

      createdAt: validDateTime(item.createdAt)
        ? item.createdAt
        : new Date().toISOString()
    };
  }

  function normalizeWorkout(item) {
    if (
      !item ||
      !WEEK_DAYS.includes(item.day)
    ) {
      return null;
    }

    if (
      typeof item.title !== 'string' ||
      !item.title.trim()
    ) {
      return null;
    }

    return {
      id: safeId(item.id),

      day: item.day,

      title: item.title
        .trim()
        .slice(0, 120),

      duration: clampNumber(
        item.duration,
        0,
        600
      ),

      notes:
        typeof item.notes === 'string'
          ? item.notes
              .trim()
              .slice(0, 1000)
          : '',

      createdAt: validDateTime(item.createdAt)
        ? item.createdAt
        : new Date().toISOString()
    };
  }

  function safeId(value) {
    return typeof value === 'string' && value
      ? value
      : createId();
  }

  function createId() {
    if (globalThis.crypto?.randomUUID) {
      return crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function validDate(value) {
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return false;
    }

    const [year, month, day] = value
      .split('-')
      .map(Number);

    const date = new Date(
      year,
      month - 1,
      day
    );

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  function validTime(value) {
    return (
      typeof value === 'string' &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    );
  }

  function validDateTime(value) {
    return (
      typeof value === 'string' &&
      !Number.isNaN(
        new Date(value).getTime()
      )
    );
  }

  function clampNumber(value, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.min(
      max,
      Math.max(min, number)
    );
  }

  function saveState() {
    setSaveStatus('saving');

    window.clearTimeout(saveTimer);

    saveTimer = window.setTimeout(() => {
      saveTimer = null;

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(state)
        );

        setSaveStatus('saved');
      } catch (error) {
        console.error(
          'DayFlow could not save data:',
          error
        );

        setSaveStatus('error');
      }
    }, 180);
  }

  function setSaveStatus(status) {
    if (!els.saveStatus) {
      return;
    }

    els.saveStatus.classList.toggle(
      'saving',
      status === 'saving'
    );

    els.saveStatus.classList.toggle(
      'error',
      status === 'error'
    );

    els.saveStatus.textContent = '';

    const dot = document.createElement('span');

    dot.className = 'status-dot';
    dot.setAttribute(
      'aria-hidden',
      'true'
    );

    const message =
      status === 'saving'
        ? 'Saving…'
        : status === 'error'
          ? 'Save failed'
          : 'Saved';

    els.saveStatus.append(
      dot,
      document.createTextNode(message)
    );
  }

  function commit() {
    saveState();
    renderAll();
  }

  function todayKey() {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function dateFromKey(key) {
    return new Date(`${key}T12:00:00`);
  }

  function formatLongDate(key) {
    const date = dateFromKey(key);

    if (Number.isNaN(date.getTime())) {
      return key;
    }

    return new Intl.DateTimeFormat(
      undefined,
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }
    ).format(date);
  }

  function formatDayTitle(key) {
    if (key === todayKey()) {
      return 'Today';
    }

    const date = dateFromKey(key);

    if (Number.isNaN(date.getTime())) {
      return key;
    }

    return new Intl.DateTimeFormat(
      undefined,
      {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }
    ).format(date);
  }

  function formatTime(value) {
    if (!validTime(value)) {
      return value;
    }

    const [hours, minutes] = value
      .split(':')
      .map(Number);

    const date = new Date();

    date.setHours(
      hours,
      minutes,
      0,
      0
    );

    return new Intl.DateTimeFormat(
      undefined,
      {
        hour: 'numeric',
        minute: '2-digit'
      }
    ).format(date);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(
      undefined,
      {
        maximumFractionDigits: 1
      }
    ).format(value || 0);
  }

  function currentWeekday() {
    const index =
      (new Date().getDay() + 6) % 7;

    return WEEK_DAYS[index];
  }

  function makeEmptyState(
    message =
      'Add your first item using the form above.'
  ) {
    const fragment =
      els.emptyStateTemplate.content.cloneNode(
        true
      );

    const paragraph =
      fragment.querySelector('p');

    if (paragraph) {
      paragraph.textContent = message;
    }

    return fragment;
  }

  function makeDeleteButton(
    label,
    onClick
  ) {
    const button =
      document.createElement('button');

    button.className = 'delete-button';
    button.type = 'button';

    button.setAttribute(
      'aria-label',
      label
    );

    button.title = label;
    button.textContent = '×';

    button.addEventListener(
      'click',
      onClick
    );

    return button;
  }

  function navigate(
    section,
    updateHash = true
  ) {
    const safeSection =
      SECTIONS.includes(section)
        ? section
        : 'overview';

    $$('.page-section').forEach(
      (panel) => {
        const active =
          panel.id === safeSection;

        panel.classList.toggle(
          'active',
          active
        );

        panel.setAttribute(
          'aria-hidden',
          String(!active)
        );

        panel.toggleAttribute(
          'inert',
          !active
        );
      }
    );

    $$('.nav-button').forEach(
      (button) => {
        const active =
          button.dataset.section ===
          safeSection;

        button.classList.toggle(
          'active',
          active
        );

        button.setAttribute(
          'aria-current',
          active ? 'page' : 'false'
        );
      }
    );

    els.pageTitle.textContent =
      SECTION_TITLES[safeSection];

    document.title =
      `${SECTION_TITLES[safeSection]} — DayFlow`;

    if (
      updateHash &&
      location.hash !== `#${safeSection}`
    ) {
      history.replaceState(
        null,
        '',
        `#${safeSection}`
      );
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function enhanceSelect(select) {
    if (
      !select ||
      customSelects.has(select)
    ) {
      return;
    }

    const shell =
      document.createElement('div');

    shell.className = 'select-shell';

    select.parentNode.insertBefore(
      shell,
      select
    );

    shell.append(select);

    select.classList.add(
      'native-select'
    );

    select.tabIndex = -1;

    select.setAttribute(
      'aria-hidden',
      'true'
    );

    const trigger =
      document.createElement('button');

    trigger.className = 'select-trigger';
    trigger.type = 'button';

    trigger.setAttribute(
      'aria-haspopup',
      'listbox'
    );

    trigger.setAttribute(
      'aria-expanded',
      'false'
    );

    const label = select.labels?.[0];

    trigger.setAttribute(
      'aria-label',
      label?.textContent.trim() ||
        'Choose an option'
    );

    label?.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        trigger.focus();
      }
    );

    const value =
      document.createElement('span');

    value.className = 'select-value';

    const chevron =
      document.createElement('span');

    chevron.className =
      'select-chevron';

    chevron.setAttribute(
      'aria-hidden',
      'true'
    );

    trigger.append(
      value,
      chevron
    );

    const menu =
      document.createElement('div');

    menu.className = 'select-menu';

    menu.id =
      `${select.id || createId()}-menu`;

    menu.setAttribute(
      'role',
      'listbox'
    );

    menu.setAttribute(
      'aria-label',
      label?.textContent.trim() ||
        'Options'
    );

    menu.setAttribute(
      'aria-hidden',
      'true'
    );

    trigger.setAttribute(
      'aria-controls',
      menu.id
    );

    const optionButtons =
      [...select.options].map(
        (option, index) => {
          const button =
            document.createElement(
              'button'
            );

          button.className =
            'select-option';

          button.type = 'button';

          button.textContent =
            option.textContent;

          button.dataset.value =
            option.value;

          button.dataset.index =
            String(index);

          button.id =
            `${menu.id}-option-${index}`;

          button.setAttribute(
            'role',
            'option'
          );

          button.tabIndex = -1;

          button.addEventListener(
            'click',
            () => {
              select.value =
                option.value;

              select.dispatchEvent(
                new Event('change', {
                  bubbles: true
                })
              );

              closeSelect(true);
            }
          );

          button.addEventListener(
            'keydown',
            (event) => {
              const currentIndex =
                Number(
                  button.dataset.index
                );

              if (
                event.key ===
                'ArrowDown'
              ) {
                event.preventDefault();

                focusOption(
                  Math.min(
                    optionButtons.length -
                      1,
                    currentIndex + 1
                  )
                );
              } else if (
                event.key === 'ArrowUp'
              ) {
                event.preventDefault();

                focusOption(
                  Math.max(
                    0,
                    currentIndex - 1
                  )
                );
              } else if (
                event.key === 'Home'
              ) {
                event.preventDefault();
                focusOption(0);
              } else if (
                event.key === 'End'
              ) {
                event.preventDefault();

                focusOption(
                  optionButtons.length - 1
                );
              } else if (
                event.key === 'Escape'
              ) {
                event.preventDefault();
                closeSelect(true);
              } else if (
                event.key === 'Tab'
              ) {
                closeSelect(false);
              }
            }
          );

          menu.append(button);

          return button;
        }
      );

    shell.append(
      trigger,
      menu
    );

    function selectedIndex() {
      return Math.max(
        0,
        select.selectedIndex
      );
    }

    function focusOption(index) {
      const target =
        optionButtons[index];

      if (!target) {
        return;
      }

      optionButtons.forEach(
        (item) => {
          item.classList.remove(
            'focused'
          );
        }
      );

      target.classList.add(
        'focused'
      );

      target.tabIndex = 0;

      target.focus({
        preventScroll: true
      });

      target.scrollIntoView({
        block: 'nearest'
      });
    }

    function sync() {
      const selected =
        select.options[
          selectedIndex()
        ];

      value.textContent =
        selected?.textContent ||
        'Choose an option';

      trigger.disabled =
        select.disabled;

      shell.classList.toggle(
        'disabled',
        select.disabled
      );

      optionButtons.forEach(
        (button, index) => {
          const isSelected =
            index === selectedIndex();

          button.classList.toggle(
            'selected',
            isSelected
          );

          button.setAttribute(
            'aria-selected',
            String(isSelected)
          );
        }
      );
    }

    function openSelect(
      preferredIndex =
        selectedIndex()
    ) {
      if (select.disabled) {
        return;
      }

      if (
        openCustomSelect &&
        openCustomSelect !== api
      ) {
        openCustomSelect.close(false);
      }

      shell.classList.add('open');

      trigger.setAttribute(
        'aria-expanded',
        'true'
      );

      menu.setAttribute(
        'aria-hidden',
        'false'
      );

      openCustomSelect = api;

      window.requestAnimationFrame(
        () => {
          focusOption(
            preferredIndex
          );
        }
      );
    }

    function closeSelect(
      returnFocus = false
    ) {
      shell.classList.remove(
        'open'
      );

      trigger.setAttribute(
        'aria-expanded',
        'false'
      );

      menu.setAttribute(
        'aria-hidden',
        'true'
      );

      optionButtons.forEach(
        (button) => {
          button.classList.remove(
            'focused'
          );

          button.tabIndex = -1;
        }
      );

      if (
        openCustomSelect === api
      ) {
        openCustomSelect = null;
      }

      if (returnFocus) {
        trigger.focus();
      }
    }

    trigger.addEventListener(
      'click',
      () => {
        if (
          shell.classList.contains(
            'open'
          )
        ) {
          closeSelect(false);
        } else {
          openSelect();
        }
      }
    );

    trigger.addEventListener(
      'keydown',
      (event) => {
        const openKeys = [
          'ArrowDown',
          'ArrowUp',
          'Enter',
          ' '
        ];

        if (
          openKeys.includes(
            event.key
          )
        ) {
          event.preventDefault();

          const offset =
            event.key ===
            'ArrowUp'
              ? -1
              : 0;

          openSelect(
            Math.max(
              0,
              Math.min(
                optionButtons.length -
                  1,
                selectedIndex() +
                  offset
              )
            )
          );
        }
      }
    );

    select.addEventListener(
      'change',
      sync
    );

    select
      .closest('form')
      ?.addEventListener(
        'reset',
        () => {
          window.requestAnimationFrame(
            sync
          );
        }
      );

    const observer =
      new MutationObserver(sync);

    observer.observe(select, {
      attributes: true,
      attributeFilter: [
        'disabled'
      ]
    });

    const api = {
      shell,
      trigger,
      menu,
      sync,
      close: closeSelect
    };

    customSelects.set(
      select,
      api
    );

    sync();
  }

  function initializeCustomSelects() {
    $$('select').forEach(
      enhanceSelect
    );

    document.addEventListener(
      'pointerdown',
      (event) => {
        if (
          openCustomSelect &&
          !openCustomSelect.shell.contains(
            event.target
          )
        ) {
          openCustomSelect.close(
            false
          );
        }
      }
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'Escape' &&
          openCustomSelect
        ) {
          openCustomSelect.close(
            true
          );
        }
      }
    );
  }

  function syncCustomSelects() {
    customSelects.forEach(
      (component) => {
        component.sync();
      }
    );
  }

  function renderAll() {
    renderOverview();
    renderTasks();
    renderSchedule();
    renderMeals();
    renderWorkouts();
  }

  function renderOverview() {
    const today = todayKey();

    const totalTasks =
      state.tasks.length;

    const doneTasks =
      state.tasks.filter(
        (task) => task.done
      ).length;

    const openTasks =
      totalTasks - doneTasks;

    const progress = totalTasks
      ? Math.round(
          (doneTasks / totalTasks) *
            100
        )
      : 0;

    els.progressPercent.textContent =
      `${progress}%`;

    els.progressRing.style.setProperty(
      '--progress',
      `${progress * 3.6}deg`
    );

    els.progressRing.setAttribute(
      'aria-valuenow',
      String(progress)
    );

    els.progressRing.setAttribute(
      'aria-valuetext',
      `${progress}% complete`
    );

    els.progressText.textContent =
      totalTasks
        ? `${doneTasks} of ${totalTasks} task${
            totalTasks === 1
              ? ''
              : 's'
          } complete`
        : 'No tasks added yet';

    els.openTaskCount.textContent =
      String(openTasks);

    const todaysSchedule =
      state.schedule
        .filter(
          (item) =>
            item.date === today
        )
        .sort(
          compareScheduleItems
        );

    els.scheduleCount.textContent =
      String(
        todaysSchedule.length
      );

    const todaysMeals =
      state.meals.filter(
        (item) =>
          item.date === today
      );

    const todaysCalories =
      todaysMeals.reduce(
        (sum, meal) =>
          sum + meal.calories,
        0
      );

    els.calorieCount.textContent =
      formatNumber(
        todaysCalories
      );

    const plannedDays =
      new Set(
        state.workouts.map(
          (workout) =>
            workout.day
        )
      );

    els.workoutDayCount.textContent =
      String(plannedDays.size);

    els.overviewTaskList.replaceChildren();

    const previewTasks =
      [...state.tasks]
        .sort(
          (a, b) =>
            Number(a.done) -
              Number(b.done) ||
            b.createdAt.localeCompare(
              a.createdAt
            )
        )
        .slice(0, 5);

    if (!previewTasks.length) {
      els.overviewTaskList.append(
        makeEmptyState(
          'Add a reminder above to start your checklist.'
        )
      );
    } else {
      previewTasks.forEach(
        (task) => {
          const row =
            document.createElement(
              'div'
            );

          row.className =
            `mini-item${
              task.done
                ? ' done'
                : ''
            }`;

          const checkbox =
            document.createElement(
              'input'
            );

          checkbox.type =
            'checkbox';

          checkbox.className =
            'mini-check';

          checkbox.checked =
            task.done;

          checkbox.setAttribute(
            'aria-label',
            `Mark “${task.text}” ${
              task.done
                ? 'open'
                : 'done'
            }`
          );

          checkbox.addEventListener(
            'change',
            () =>
              toggleTask(
                task.id
              )
          );

          const label =
            document.createElement(
              'label'
            );

          label.textContent =
            task.text;

          row.append(
            checkbox,
            label
          );

          els.overviewTaskList.append(
            row
          );
        }
      );
    }

    els.overviewScheduleList.replaceChildren();

    const upcoming =
      todaysSchedule
        .filter(
          (item) =>
            item.end >=
            currentTimeKey()
        )
        .slice(0, 5);

    const schedulePreview =
      upcoming.length
        ? upcoming
        : todaysSchedule.slice(
            0,
            5
          );

    if (
      !schedulePreview.length
    ) {
      els.overviewScheduleList.append(
        makeEmptyState(
          'No time blocks planned for today.'
        )
      );
    } else {
      schedulePreview.forEach(
        (item) => {
          const row =
            document.createElement(
              'div'
            );

          row.className =
            'timeline-preview-item';

          const time =
            document.createElement(
              'time'
            );

          time.dateTime =
            `${item.date}T${item.start}`;

          time.textContent =
            formatTime(
              item.start
            );

          const activity =
            document.createElement(
              'p'
            );

          activity.textContent =
            item.activity;

          row.append(
            time,
            activity
          );

          els.overviewScheduleList.append(
            row
          );
        }
      );
    }
  }

  function currentTimeKey() {
    const now = new Date();

    const hours = String(
      now.getHours()
    ).padStart(2, '0');

    const minutes = String(
      now.getMinutes()
    ).padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  function renderTasks() {
    els.taskList.replaceChildren();

    const tasks = [
      ...state.tasks
    ]
      .filter((task) => {
        if (
          activeTaskFilter ===
          'open'
        ) {
          return !task.done;
        }

        if (
          activeTaskFilter ===
          'done'
        ) {
          return task.done;
        }

        return true;
      })
      .sort(
        (a, b) =>
          Number(a.done) -
            Number(b.done) ||
          priorityRank(
            b.priority
          ) -
            priorityRank(
              a.priority
            ) ||
          b.createdAt.localeCompare(
            a.createdAt
          )
      );

    if (!tasks.length) {
      const message =
        activeTaskFilter === 'all'
          ? 'Add your first checklist task using the form above.'
          : `No ${activeTaskFilter} tasks right now.`;

      els.taskList.append(
        makeEmptyState(message)
      );

      return;
    }

    tasks.forEach((task) => {
      const row =
        document.createElement(
          'div'
        );

      row.className =
        `task-item${
          task.done
            ? ' done'
            : ''
        }`;

      const checkbox =
        document.createElement(
          'input'
        );

      checkbox.type =
        'checkbox';

      checkbox.className =
        'task-checkbox';

      checkbox.checked =
        task.done;

      checkbox.setAttribute(
        'aria-label',
        `Mark “${task.text}” ${
          task.done
            ? 'open'
            : 'done'
        }`
      );

      checkbox.addEventListener(
        'change',
        () =>
          toggleTask(task.id)
      );

      const main =
        document.createElement(
          'div'
        );

      main.className =
        'item-main';

      const title =
        document.createElement(
          'strong'
        );

      title.className =
        'item-title';

      title.textContent =
        task.text;

      const meta =
        document.createElement(
          'div'
        );

      meta.className =
        'item-meta';

      const category =
        document.createElement(
          'span'
        );

      category.className =
        'badge';

      category.textContent =
        task.category;

      const priority =
        document.createElement(
          'span'
        );

      priority.className =
        `badge priority-${task.priority}`;

      priority.textContent =
        `${capitalize(
          task.priority
        )} priority`;

      meta.append(
        category,
        priority
      );

      main.append(
        title,
        meta
      );

      row.append(
        checkbox,
        main,
        makeDeleteButton(
          `Delete “${task.text}”`,
          () =>
            deleteTask(
              task.id
            )
        )
      );

      els.taskList.append(row);
    });
  }

  function priorityRank(
    priority
  ) {
    return {
      low: 0,
      normal: 1,
      high: 2
    }[priority] ?? 1;
  }

  function capitalize(value) {
    return (
      value
        .charAt(0)
        .toUpperCase() +
      value.slice(1)
    );
  }

  function addTask(
    text,
    category = 'Personal',
    priority = 'normal'
  ) {
    const cleanText =
      text.trim();

    if (!cleanText) {
      return;
    }

    state.tasks.unshift({
      id: createId(),

      text: cleanText.slice(
        0,
        140
      ),

      category,

      priority,

      done: false,

      createdAt:
        new Date().toISOString()
    });

    commit();
  }

  function toggleTask(id) {
    const task =
      state.tasks.find(
        (item) =>
          item.id === id
      );

    if (!task) {
      return;
    }

    task.done = !task.done;

    commit();
  }

  function deleteTask(id) {
    state.tasks =
      state.tasks.filter(
        (task) =>
          task.id !== id
      );

    commit();
  }

  function renderSchedule() {
    const selectedDate =
      els.scheduleFilterDate
        .value || todayKey();

    els.scheduleFilterDate.value =
      selectedDate;

    els.scheduleDayTitle.textContent =
      formatDayTitle(
        selectedDate
      );

    els.scheduleList.replaceChildren();

    const items =
      state.schedule
        .filter(
          (item) =>
            item.date ===
            selectedDate
        )
        .sort(
          compareScheduleItems
        );

    if (!items.length) {
      els.scheduleList.append(
        makeEmptyState(
          'No time blocks planned for this day.'
        )
      );

      return;
    }

    items.forEach((item) => {
      const row =
        document.createElement(
          'div'
        );

      row.className =
        'schedule-item';

      const timeBlock =
        document.createElement(
          'div'
        );

      timeBlock.className =
        'time-block';

      const start =
        document.createElement(
          'strong'
        );

      start.textContent =
        formatTime(
          item.start
        );

      const end =
        document.createElement(
          'small'
        );

      end.textContent =
        `to ${formatTime(
          item.end
        )}`;

      timeBlock.append(
        start,
        end
      );

      const main =
        document.createElement(
          'div'
        );

      main.className =
        'item-main';

      const title =
        document.createElement(
          'strong'
        );

      title.className =
        'item-title';

      title.textContent =
        item.activity;

      main.append(title);

      row.append(
        timeBlock,
        main,
        makeDeleteButton(
          `Delete “${item.activity}”`,
          () => {
            state.schedule =
              state.schedule.filter(
                (entry) =>
                  entry.id !==
                  item.id
              );

            commit();
          }
        )
      );

      els.scheduleList.append(
        row
      );
    });
  }

  function compareScheduleItems(
    a,
    b
  ) {
    return (
      a.start.localeCompare(
        b.start
      ) ||
      a.end.localeCompare(
        b.end
      ) ||
      a.createdAt.localeCompare(
        b.createdAt
      )
    );
  }

  function renderMeals() {
    const selectedDate =
      els.mealFilterDate
        .value || todayKey();

    els.mealFilterDate.value =
      selectedDate;

    els.mealDayTitle.textContent =
      formatDayTitle(
        selectedDate
      );

    els.mealList.replaceChildren();

    const meals =
      state.meals
        .filter(
          (item) =>
            item.date ===
            selectedDate
        )
        .sort(
          (a, b) =>
            mealRank(a.type) -
              mealRank(b.type) ||
            a.createdAt.localeCompare(
              b.createdAt
            )
        );

    const totals =
      meals.reduce(
        (sum, meal) => ({
          calories:
            sum.calories +
            meal.calories,

          protein:
            sum.protein +
            meal.protein,

          carbs:
            sum.carbs +
            meal.carbs,

          fat:
            sum.fat +
            meal.fat
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      );

    els.totalCalories.textContent =
      formatNumber(
        totals.calories
      );

    els.totalProtein.textContent =
      formatNumber(
        totals.protein
      );

    els.totalCarbs.textContent =
      formatNumber(
        totals.carbs
      );

    els.totalFat.textContent =
      formatNumber(
        totals.fat
      );

    if (!meals.length) {
      els.mealList.append(
        makeEmptyState(
          'No meals planned for this day.'
        )
      );

      return;
    }

    meals.forEach((meal) => {
      const row =
        document.createElement(
          'div'
        );

      row.className =
        'meal-item';

      const type =
        document.createElement(
          'div'
        );

      type.className =
        'meal-type';

      type.textContent =
        meal.type;

      const main =
        document.createElement(
          'div'
        );

      main.className =
        'item-main';

      const title =
        document.createElement(
          'strong'
        );

      title.className =
        'item-title';

      title.textContent =
        meal.food;

      const macros =
        document.createElement(
          'div'
        );

      macros.className =
        'macro-line';

      const macroValues = [
        `${formatNumber(
          meal.calories
        )} kcal`,

        `${formatNumber(
          meal.protein
        )}g protein`,

        `${formatNumber(
          meal.carbs
        )}g carbs`,

        `${formatNumber(
          meal.fat
        )}g fat`
      ];

      macroValues.forEach(
        (text) => {
          const span =
            document.createElement(
              'span'
            );

          span.textContent =
            text;

          macros.append(span);
        }
      );

      main.append(
        title,
        macros
      );

      row.append(
        type,
        main,
        makeDeleteButton(
          `Delete “${meal.food}”`,
          () => {
            state.meals =
              state.meals.filter(
                (entry) =>
                  entry.id !==
                  meal.id
              );

            commit();
          }
        )
      );

      els.mealList.append(
        row
      );
    });
  }

  function mealRank(type) {
    return {
      Breakfast: 0,
      Lunch: 1,
      Dinner: 2,
      Snack: 3
    }[type] ?? 4;
  }

  function renderWorkouts() {
    els.workoutWeek.replaceChildren();

    const today =
      currentWeekday();

    WEEK_DAYS.forEach(
      (day) => {
        const card =
          document.createElement(
            'article'
          );

        card.className =
          `day-card${
            day === today
              ? ' today'
              : ''
          }`;

        const header =
          document.createElement(
            'div'
          );

        header.className =
          'day-card-header';

        const heading =
          document.createElement(
            'h3'
          );

        heading.textContent =
          day;

        header.append(
          heading
        );

        if (day === today) {
          const label =
            document.createElement(
              'span'
            );

          label.className =
            'today-label';

          label.textContent =
            'Today';

          header.append(
            label
          );
        }

        card.append(header);

        const workouts =
          state.workouts
            .filter(
              (item) =>
                item.day === day
            )
            .sort(
              (a, b) =>
                a.createdAt.localeCompare(
                  b.createdAt
                )
            );

        if (!workouts.length) {
          const empty =
            document.createElement(
              'div'
            );

          empty.className =
            'day-empty';

          empty.textContent =
            'Rest day or add a workout above.';

          card.append(empty);
        } else {
          workouts.forEach(
            (workout) => {
              const entry =
                document.createElement(
                  'div'
                );

              entry.className =
                'workout-entry';

              const title =
                document.createElement(
                  'strong'
                );

              title.textContent =
                workout.title;

              entry.append(title);

              if (
                workout.duration >
                0
              ) {
                const duration =
                  document.createElement(
                    'small'
                  );

                duration.textContent =
                  `${formatNumber(
                    workout.duration
                  )} minutes`;

                entry.append(
                  duration
                );
              }

              if (
                workout.notes
              ) {
                const notes =
                  document.createElement(
                    'p'
                  );

                notes.textContent =
                  workout.notes;

                entry.append(
                  notes
                );
              }

              entry.append(
                makeDeleteButton(
                  `Delete “${workout.title}”`,
                  () => {
                    state.workouts =
                      state.workouts.filter(
                        (item) =>
                          item.id !==
                          workout.id
                      );

                    commit();
                  }
                )
              );

              card.append(
                entry
              );
            }
          );
        }

        els.workoutWeek.append(
          card
        );
      }
    );
  }

  function exportData() {
    const payload = {
      app: 'DayFlow',

      exportedAt:
        new Date().toISOString(),

      data: state
    };

    const blob = new Blob(
      [
        JSON.stringify(
          payload,
          null,
          2
        )
      ],
      {
        type: 'application/json'
      }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;

    anchor.download =
      `dayflow-backup-${todayKey()}.json`;

    document.body.append(
      anchor
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  async function importData(
    file
  ) {
    if (!file) {
      return;
    }

    try {
      const text =
        await file.text();

      const parsed =
        JSON.parse(text);

      const source =
        parsed?.data &&
        typeof parsed.data ===
          'object'
          ? parsed.data
          : parsed;

      const imported =
        normalizeState(source);

      const itemCount =
        imported.tasks.length +
        imported.schedule.length +
        imported.meals.length +
        imported.workouts.length;

      const approved =
        window.confirm(
          `Import ${itemCount} planner item${
            itemCount === 1
              ? ''
              : 's'
          }? This will replace the current DayFlow data.`
        );

      if (!approved) {
        return;
      }

      state = imported;

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

      setSaveStatus('saved');

      renderAll();

      window.alert(
        'DayFlow data imported successfully.'
      );
    } catch (error) {
      console.error(
        'DayFlow import failed:',
        error
      );

      window.alert(
        'That file could not be imported. Choose a valid DayFlow JSON backup.'
      );
    } finally {
      els.importInput.value = '';
    }
  }

  function resetAllData() {
    const approved =
      window.confirm(
        'Reset all DayFlow data? This cannot be undone unless you exported a backup.'
      );

    if (!approved) {
      return;
    }

    state = defaultState();

    localStorage.removeItem(
      STORAGE_KEY
    );

    setDefaultDates();
    syncCustomSelects();
    setSaveStatus('saved');
    renderAll();
  }

  function setDefaultDates() {
    const today = todayKey();

    els.scheduleDate.value =
      today;

    els.scheduleFilterDate.value =
      today;

    els.mealDate.value =
      today;

    els.mealFilterDate.value =
      today;

    els.workoutDay.value =
      currentWeekday();
  }

  function bindEvents() {
    $$('.nav-button').forEach(
      (button) => {
        button.addEventListener(
          'click',
          () =>
            navigate(
              button.dataset.section
            )
        );
      }
    );

    $$('[data-go-to]').forEach(
      (button) => {
        button.addEventListener(
          'click',
          () =>
            navigate(
              button.dataset.goTo
            )
        );
      }
    );

    window.addEventListener(
      'hashchange',
      () => {
        navigate(
          location.hash.slice(1),
          false
        );
      }
    );

    els.quickTaskForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        addTask(
          els.quickTaskInput.value,
          'Personal',
          'normal'
        );

        els.quickTaskForm.reset();

        els.quickTaskInput.focus();
      }
    );

    els.taskForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        addTask(
          els.taskInput.value,
          els.taskCategory.value,
          els.taskPriority.value
        );

        els.taskForm.reset();

        els.taskPriority.value =
          'normal';

        syncCustomSelects();

        els.taskInput.focus();
      }
    );

    $$('.filter-button').forEach(
      (button) => {
        button.addEventListener(
          'click',
          () => {
            activeTaskFilter =
              button.dataset.filter;

            $$('.filter-button').forEach(
              (item) => {
                item.classList.toggle(
                  'active',
                  item === button
                );
              }
            );

            renderTasks();
          }
        );
      }
    );

    els.clearCompletedButton.addEventListener(
      'click',
      () => {
        const completedCount =
          state.tasks.filter(
            (task) => task.done
          ).length;

        if (!completedCount) {
          return;
        }

        const approved =
          window.confirm(
            `Clear ${completedCount} completed task${
              completedCount === 1
                ? ''
                : 's'
            }?`
          );

        if (!approved) {
          return;
        }

        state.tasks =
          state.tasks.filter(
            (task) => !task.done
          );

        commit();
      }
    );

    els.scheduleForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        els.scheduleMessage.textContent =
          '';

        const start =
          els.startTime.value;

        const end =
          els.endTime.value;

        if (start >= end) {
          els.scheduleMessage.textContent =
            'The finish time must be later than the start time.';

          els.endTime.focus();

          return;
        }

        state.schedule.push({
          id: createId(),

          date:
            els.scheduleDate.value,

          start,

          end,

          activity:
            els.scheduleActivity.value
              .trim()
              .slice(0, 160),

          createdAt:
            new Date().toISOString()
        });

        els.scheduleFilterDate.value =
          els.scheduleDate.value;

        const retainedDate =
          els.scheduleDate.value;

        els.scheduleForm.reset();

        els.scheduleDate.value =
          retainedDate;

        els.scheduleMessage.textContent =
          '';

        commit();

        els.startTime.focus();
      }
    );

    els.scheduleFilterDate.addEventListener(
      'change',
      renderSchedule
    );

    els.mealForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        const date =
          els.mealDate.value;

        state.meals.push({
          id: createId(),

          date,

          type:
            els.mealType.value,

          food:
            els.foodName.value
              .trim()
              .slice(0, 160),

          calories:
            clampNumber(
              els.calories.value,
              0,
              10000
            ),

          protein:
            clampNumber(
              els.protein.value,
              0,
              1000
            ),

          carbs:
            clampNumber(
              els.carbs.value,
              0,
              1000
            ),

          fat:
            clampNumber(
              els.fat.value,
              0,
              1000
            ),

          createdAt:
            new Date().toISOString()
        });

        els.mealFilterDate.value =
          date;

        els.mealForm.reset();

        els.mealDate.value =
          date;

        syncCustomSelects();

        commit();

        els.foodName.focus();
      }
    );

    els.mealFilterDate.addEventListener(
      'change',
      renderMeals
    );

    els.workoutForm.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();

        const day =
          els.workoutDay.value;

        state.workouts.push({
          id: createId(),

          day,

          title:
            els.workoutTitle.value
              .trim()
              .slice(0, 120),

          duration:
            clampNumber(
              els.workoutDuration.value,
              0,
              600
            ),

          notes:
            els.workoutNotes.value
              .trim()
              .slice(0, 1000),

          createdAt:
            new Date().toISOString()
        });

        els.workoutForm.reset();

        els.workoutDay.value =
          day;

        syncCustomSelects();

        commit();

        els.workoutTitle.focus();
      }
    );

    els.exportButton.addEventListener(
      'click',
      exportData
    );

    els.importButton.addEventListener(
      'click',
      () => {
        els.importInput.click();
      }
    );

    els.importInput.addEventListener(
      'change',
      () => {
        importData(
          els.importInput.files?.[0]
        );
      }
    );

    els.resetAllButton.addEventListener(
      'click',
      resetAllData
    );

    window.addEventListener(
      'pagehide',
      () => {
        if (!saveTimer) {
          return;
        }

        window.clearTimeout(
          saveTimer
        );

        saveTimer = null;

        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
          );
        } catch (error) {
          console.error(
            'DayFlow could not finish saving data:',
            error
          );
        }
      }
    );
  }

  function initialize() {
    const today = todayKey();

    els.currentDate.textContent =
      formatLongDate(today);

    els.currentDate.dateTime =
      today;

    setDefaultDates();

    initializeCustomSelects();

    bindEvents();

    renderAll();

    navigate(
      location.hash.slice(1) ||
        'overview',
      false
    );

    setSaveStatus('saved');
  }

  initialize();
})();