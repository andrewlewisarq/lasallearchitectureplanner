
let allSubjects = [];
let calendars = {};
let selectedSubjects = {
  '4th Fall': [],
  '4th Spring': [],
  '5th Fall': [],
  '5th Spring': []
};

function fetchData() {
  return Promise.all([
    fetch('compulsory_subjects.json').then(res => res.json()),
    fetch('elective_subjects.json').then(res => res.json()),
    fetch('thesis_subjects.json').then(res => res.json())
  ]).then(([compulsories, electives, thesis]) => {
    allSubjects = [...compulsories, ...electives, ...thesis];
    buildUI(compulsories, electives, thesis);
    initCalendars();
  });
}

function buildUI(compulsories, electives, thesis) {
  const container = document.getElementById('steps-container');

  const steps = [
    { title: '1 - CHOOSE THE COMPULSARY SUBJECTS YOU WANT TO COURSE IN 4th YEAR', data: compulsories, year: '4th' },
    { title: '2 - CHOOSE THE ELECTIVE SUBJECTS YOU WANT TO COURSE IN 4th YEAR', data: electives, year: '4th' },
    { title: '3 - CHOOSE THE COMPULSARY SUBJECTS YOU WANT TO COURSE IN 5th YEAR', data: compulsories, year: '5th' },
    { title: '4 - CHOOSE THE ELECTIVE SUBJECTS YOU WANT TO COURSE IN 5th YEAR', data: electives, year: '5th' },
  ];

  steps.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = 'subject-list';
    div.innerHTML = `<h2>${step.title}</h2>`;
    const grouped = {};
    step.data.forEach(s => {
      if (!grouped[s.name]) grouped[s.name] = [];
      grouped[s.name].push(s);
    });

    Object.keys(grouped).forEach(name => {
      const options = grouped[name].filter(s => s.semester.startsWith(step.year));
      if (options.length === 0) return;

      const line = document.createElement('div');
      if (step.title.includes('COMPULSARY')) {
        const select = document.createElement('select');
        select.innerHTML = '<option value="">-- Choose semester --</option>' +
          options.map(o => `<option value="${o.id}">${o.semester}</option>`).join('');
        select.onchange = e => {
          const selected = options.find(o => o.id === e.target.value);

          // 1) If the user had already chosen a semester before, remove it first
          if (lastChosen) {
           removeSubjectFromCalendar(lastChosen);
           selectedSubjects[lastChosen.semester] =
            selectedSubjects[lastChosen.semester].filter(s => s.id !== lastChosen.id);
           enableOtherInstances(lastChosen);      // (optional) unlock duplicates
         }

        // 2) If the new choice is a real subject (not the placeholder), add it
        if (selected) {
         addSubjectToCalendar(selected);
         disableOtherInstances(selected);       // lock duplicates
         selectedSubjects[selected.semester].push(selected);
         lastChosen = selected;                 // store current pick
       } else {
         lastChosen = null;                     // "-- Choose semester --"
       }
        };
        line.innerHTML = `<strong>${name}</strong> `;
        line.appendChild(select);
      } else {
        options.forEach(opt => {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = opt.id;
          checkbox.onchange = () => {
            if (checkbox.checked) {
              addSubjectToCalendar(opt);
              disableOtherInstances(opt);
            } else {
              removeSubjectFromCalendar(opt);
              selectedSubjects[opt.semester] =
               selectedSubjects[opt.semester].filter(s => s.id !== opt.id);
             enableOtherInstances(opt);
            }
            updateSummary();     
          };
          const label = document.createElement('label');
          label.appendChild(checkbox);
          label.append(` ${opt.name} (${opt.semester})`);
          line.appendChild(label);
        });
      }
      div.appendChild(line);
    });

    container.appendChild(div);
  });
  const tfgSelect = document.getElementById('tfgSelect');
thesis.forEach(t => {
  const opt = document.createElement('option');
  opt.value = t.id;
  opt.textContent = `${t.name} (${t.day} ${t.start}-${t.end})`;
  tfgSelect.appendChild(opt);
});

tfgSelect.onchange = () => {
  const chosen = thesis.find(t => t.id === tfgSelect.value);
  if (!chosen) return;

  // Inject into calendar (always 5th Spring)
  const calKey = '5S';                // 5th Spring calendar div
  calendars[calKey].addEvent({
    title: chosen.name,
    daysOfWeek: [dayToNumber(chosen.day)],
    startTime: chosen.start,
    endTime: chosen.end,
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
    textColor: '#fff',
    classNames: ['tfg']
  });

  selectedSubjects['5th Spring'].push(chosen);  

  // lock select so it can’t be changed again
  tfgSelect.disabled = true;
};
}

function disableOtherInstances(selected) {
  const subjectCode = selected.id.split('_')[0];

  // Disable all checkboxes with this subject code
  const checkboxes = document.querySelectorAll(`input[type="checkbox"]`);
  checkboxes.forEach(cb => {
    if (cb.id.startsWith(subjectCode)) {
      cb.disabled = true;
    }
  });

  // Disable all selects containing this subject
  const selects = document.querySelectorAll('select');
  selects.forEach(sel => {
    const options = Array.from(sel.options);
    const hasSubject = options.some(opt => opt.value.startsWith(subjectCode));
    if (hasSubject) {
      sel.disabled = true;
    }
  });
}

function initCalendars() {
  ['4F','4S','5F','5S'].forEach(code => {
    const el = document.getElementById('cal' + code);
    const cal = new FullCalendar.Calendar(el, {
      initialView: 'timeGridWeek',
      weekends: false,
      initialDate: '2025-01-06', // A Monday as static anchor
      headerToolbar: false,
      dayHeaderFormat: { weekday: 'long' },
      allDaySlot: false,
      slotMinTime: "14:00",
      slotMaxTime: "21:00",
      height: "auto"
    });
    cal.render();
    calendars[code] = cal;
  });
}

function addSubjectToCalendar(subj) {
  const calKey = subj.semester.includes('4th') ?
    (subj.semester.includes('Fall') ? '4F' : '4S') :
    (subj.semester.includes('Fall') ? '5F' : '5S');

  calendars[calKey].addEvent({
      backgroundColor: subj.type === 'Elective' ? '#4CAF50' : '#2196f3',
      borderColor: subj.type === 'Elective' ? '#4CAF50' : '#2196f3',
      textColor: '#fff',

    title: subj.name,
    daysOfWeek: [dayToNumber(subj.day)],
    startTime: subj.start,
    endTime: subj.end
  });

  const semKey = subj.semester.includes("4th")
  ? (subj.semester.includes("Fall") || subj.semester.includes("S1") ? "4th Fall" : "4th Spring")
  : (subj.semester.includes("Fall") || subj.semester.includes("S1") ? "5th Fall" : "5th Spring");

selectedSubjects[semKey].push(subj);
  updateSummary();
}

function updateSummary() {
  const summary = {
    '4th': { compulsory: 0, elective: 0 },
    '5th': { compulsory: 0, elective: 0 }
  };

  Object.keys(selectedSubjects).forEach(sem => {
    const year = sem.includes('4th') ? '4th' : '5th';
    selectedSubjects[sem].forEach(sub => {
      if (sub.type === 'Compulsory') summary[year].compulsory += sub.credits;
      else summary[year].elective += sub.credits;
    });
  });

  const total = year => summary[year].compulsory + summary[year].elective;
  document.getElementById('creditSummary').textContent =
    `TOTAL AMOUNT OF COMPULSORY CREDITS IN 4TH YEAR: ${summary['4th'].compulsory}
TOTAL AMOUNT OF ELECTIVE CREDITS IN 4TH YEAR: ${summary['4th'].elective}
TOTAL AMOUNT OF CREDITS IN 4TH YEAR: ${total('4th')}

TOTAL AMOUNT OF COMPULSORY CREDITS IN 5TH YEAR: ${summary['5th'].compulsory}
TOTAL AMOUNT OF ELECTIVE CREDITS IN 5TH YEAR: ${summary['5th'].elective}
TOTAL AMOUNT OF CREDITS IN 5TH YEAR: ${total('5th')}
`;
}

function dayToNumber(day) {
  return { "Monday":1, "Tuesday":2, "Wednesday":3, "Thursday":4, "Friday":5 }[day];
}

fetchData();



function runChecks() {
  const messages = [];
  const selectedAll = Object.values(selectedSubjects).flat();


    // a) At least 80 ECTS from compulsory subjects
  const allSelectedSubjects = Object.values(selectedSubjects).flat();
  const compulsoryCredits = allSelectedSubjects
    .filter(s => s.type === "Compulsory")
    .reduce((sum, s) => sum + s.credits, 0);
  if (compulsoryCredits < 80) {
    messages.push("⚠️ You must select at least 84 ECTS from compulsory subjects.");
  }

  // b) Check for overlaps
  let conflictFound = false;
  const timeBlocks = {};

  selectedAll.forEach(s => {
    const key = `${s.semester}-${s.day}`;
    const start = parseInt(s.start.replace(':',''));
    const end = parseInt(s.end.replace(':',''));

    if (!timeBlocks[key]) {
      timeBlocks[key] = [];
    }

    for (const [s1, e1] of timeBlocks[key]) {
      if (!(end <= s1 || start >= e1)) {
        conflictFound = true;
      }
    }
    timeBlocks[key].push([start, end]);
  });

  if (conflictFound) {
    messages.push("⚠️ Some subjects overlap in time. Please revise your selection.");
  }

  // c) Check that at least 30 elective credits have been selected
  const totalElectiveCredits = selectedAll
    .filter(s => s.type === 'Elective')
    .reduce((sum, s) => sum + s.credits, 0);

  if (totalElectiveCredits < 30) {
    messages.push("⚠️ You must select at least 30 elective credits.");
  }

  // Final message
  const resultBox = document.getElementById("checkResults");
  if (messages.length === 0) {
    resultBox.style.color = "green";
    resultBox.textContent = "✅ Your planning is okay!";
  } else {
    resultBox.style.color = "red";
    resultBox.innerHTML = messages.join("<br>");
  }
}


function removeSubjectFromCalendar(subj) {
  const calKey = subj.semester.includes('4th') ?
    (subj.semester.includes('Fall') ? '4F' : '4S') :
    (subj.semester.includes('Fall') ? '5F' : '5S');

  const events = calendars[calKey].getEvents();
  for (let event of events) {
    if (event.title === subj.name) {
      event.remove();
    }
  }
}
