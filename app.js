(() => {
  'use strict';

  const KEY = 'exam_checklist_v1';

  const SUBJECTS = [
    { id: 'ilhwa',       name: '일화',     color: '#d1495b' },
    { id: 'ilmul',       name: '일물',     color: '#d98324' },
    { id: 'isan',        name: '이산',     color: '#7f9a1d' },
    { id: 'gigyeonggae', name: '기경개',   color: '#2a9d8f' },
    { id: 'seongnon',    name: '성논',     color: '#3a7bd5' },
    { id: 'deboongi',    name: '데분기',   color: '#7b5cc4' },
    { id: 'mulhwagisil', name: '물화기실', color: '#c2477f' },
  ];

  // ---------- 저장 ----------
  let data = load();

  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      if (o && o.items) return o;
    } catch (e) {}
    return { items: {} };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }
  function itemsOf(id) {
    return data.items[id] || (data.items[id] = []);
  }

  // 완료율: 항목 수가 바뀌면(추가/삭제) 호출할 때마다 다시 계산된다
  function stats(list) {
    const total = list.length;
    const done = list.filter(i => i.done).length;
    const pct = total === 0 ? 0 : (done === total ? 100 : Math.floor((done / total) * 100));
    return { total, done, pct };
  }

  // ---------- DOM ----------
  const $ = s => document.querySelector(s);
  const home = $('#home'), detail = $('#detail');
  const subjectList = $('#subject-list');
  const itemList = $('#item-list');
  const addForm = $('#add-form'), addInput = $('#add-input');
  const clearBtn = $('#clear-done');

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  let current = null; // 현재 열려 있는 과목

  // ---------- 메인 ----------
  function renderHome() {
    subjectList.textContent = '';
    let T = 0, D = 0;

    SUBJECTS.forEach(s => {
      const st = stats(itemsOf(s.id));
      T += st.total; D += st.done;

      const li = el('li');
      const a = el('a');
      a.href = '#/' + s.id;
      a.style.setProperty('--accent', s.color);

      const top = el('div', 'row-top');
      top.appendChild(el('span', 'name', s.name));
      const meta = el('span', 'meta', st.done + ' / ' + st.total);
      meta.appendChild(el('b', null, st.pct + '%'));
      top.appendChild(meta);

      const bar = el('div', 'bar');
      const fill = el('div', 'fill');
      fill.style.width = st.pct + '%';
      bar.appendChild(fill);

      a.append(top, bar);
      li.appendChild(a);
      subjectList.appendChild(li);
    });

    const all = stats(Array.from({ length: T }, (_, i) => ({ done: i < D })));
    $('#overall-pct').textContent = all.pct;
    $('#overall-fill').style.width = all.pct + '%';
    $('#overall-count').textContent = D + ' / ' + T + ' 완료';
  }

  // ---------- 과목 페이지 ----------
  function updateProgress() {
    const st = stats(itemsOf(current.id));
    $('#detail-pct').textContent = st.pct;
    $('#detail-fill').style.width = st.pct + '%';
    $('#detail-count').textContent = st.done + ' / ' + st.total + ' 완료';
    $('#detail-bar').setAttribute('aria-valuenow', st.pct);
    clearBtn.hidden = st.done === 0;
  }

  function renderItems() {
    const list = itemsOf(current.id);
    itemList.textContent = '';

    if (list.length === 0) {
      itemList.appendChild(el('li', 'empty', '아직 항목이 없어요. 위 입력창에 공부할 내용을 추가해 보세요.'));
    }

    list.forEach(item => {
      const li = el('li', 'item' + (item.done ? ' done' : ''));

      const label = el('label');
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = item.done;
      cb.addEventListener('change', () => {
        item.done = cb.checked;
        li.classList.toggle('done', item.done);
        save();
        updateProgress();
      });
      label.append(cb, el('span', 'box'), el('span', 'txt', item.text));

      const del = el('button', 'del', '✕');
      del.type = 'button';
      del.setAttribute('aria-label', item.text + ' 삭제');
      del.addEventListener('click', () => {
        if (!confirm("'" + item.text + "' 항목을 삭제할까요?")) return;
        const arr = itemsOf(current.id);
        arr.splice(arr.indexOf(item), 1);
        save();
        renderItems();
        updateProgress(); // 삭제 후 비율 재계산
      });

      li.append(label, del);
      itemList.appendChild(li);
    });
  }

  function openSubject(s) {
    current = s;
    detail.style.setProperty('--accent', s.color);
    $('#detail-title').textContent = s.name;
    renderItems();
    updateProgress();
  }

  addForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = addInput.value.trim();
    if (!text) return;
    itemsOf(current.id).push({ id: Date.now() + Math.random(), text, done: false });
    save();
    addInput.value = '';
    renderItems();
    updateProgress(); // 추가 후 비율 재계산
    addInput.focus();
  });

  clearBtn.addEventListener('click', () => {
    if (!confirm('완료한 항목을 모두 삭제할까요?')) return;
    data.items[current.id] = itemsOf(current.id).filter(i => !i.done);
    save();
    renderItems();
    updateProgress();
  });

  // ---------- 화면 전환 (해시 라우팅: 뒤로가기 지원) ----------
  function route() {
    const id = location.hash.replace(/^#\/?/, '');
    const s = SUBJECTS.find(x => x.id === id);
    if (s) {
      home.hidden = true;
      detail.hidden = false;
      openSubject(s);
    } else {
      current = null;
      detail.hidden = true;
      home.hidden = false;
      renderHome();
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', () => {
    route();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  });
})();
