const skills = [
  {
    title: '小红书文案大师',
    package: 'xiaohongshu-copywriter',
    category: '内容创作',
    description: '从真实素材提炼选题，写出适合小红书的笔记和封面文案。',
    purpose: '做经验分享、教程笔记或案例复盘，也可以改写已有草稿。',
    input: '主题、亲身经历或素材，以及想触达的读者。',
    output: '选题建议、标题、正文、封面文案和标签建议。',
  },
  {
    title: '朋友圈文案大师',
    package: 'moments-copywriter',
    category: '内容创作',
    description: '把真实经历、客户案例或活动信息写成朋友圈文案。',
    purpose: '写日常分享、课程预热、案例复盘和产品介绍。',
    input: '事件或素材、想表达的重点，以及所在的发布阶段。',
    output: '可发布的朋友圈文案和配图建议。连续发布时可整理成内容排期。',
  },
  {
    title: '网页设计大师',
    package: 'web-design-studio',
    category: '设计与教学',
    description: '从需求和参考图出发，设计并制作可运行的响应式网页。',
    purpose: '搭建个人作品集、产品落地页，也可以按反馈迭代现有网页。',
    input: '页面目标、目标访客、文案素材和交互参考。',
    output: '页面结构、可运行的前端代码和桌面及手机的验收结果。',
  },
  {
    title: '造课大师',
    package: 'course-architect',
    category: '设计与教学',
    description: '把已有经验或主题整理成一套有学习目标、讲解和练习的课程。',
    purpose: '设计直播课、训练营、付费课程或企业内训。',
    input: '课程主题、学员基础、期望成果和已有案例。',
    output: '课程蓝图、教学脚本、讲义和练习。',
  },
  {
    title: '创始人思维克隆体',
    package: 'founder-interview',
    category: '访谈与决策',
    description: '通过结构化访谈梳理创始人的判断依据和决策原则。',
    purpose: '记录创始人的关键决策案例，整理供团队查阅和讨论的决策资料。',
    input: '访谈对象、真实案例和希望梳理的决策问题。',
    output: '访谈提纲、案例记录和带来源的决策原则。',
  },
];

const search = document.querySelector('#skill-search');
const filters = document.querySelector('#skill-filters');
const grid = document.querySelector('#skill-cards');
const results = document.querySelector('#skill-results');
const detail = document.querySelector('.skill-detail');
const detailFields = detail.querySelectorAll('[data-detail]');
let activeCategory = '';

function skillText(className, text) {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}

function openSkill(skill) {
  const download = detail.querySelector('.skill-download');
  download.href = `skills/${skill.package}.zip`;
  download.download = `${skill.package}.zip`;
  for (const field of detailFields) {
    field.textContent = skill[field.dataset.detail];
  }
  detail.showModal();
}

const cards = skills.map((skill, index) => {
  const item = document.createElement('li');
  const button = document.createElement('button');
  const title = skillText('skill-card-title', skill.title);
  title.id = `skill-card-title-${index}`;
  button.type = 'button';
  button.className = 'skill-card';
  button.setAttribute('aria-labelledby', title.id);
  button.setAttribute('aria-haspopup', 'dialog');
  button.append(
    skillText('skill-tag', skill.category),
    title,
    skillText('skill-card-description', skill.description),
    skillText('skill-card-action', '查看详情 →'),
  );
  button.addEventListener('click', () => openSkill(skill));
  item.append(button);
  grid.append(item);
  return { skill, item, terms: Object.values(skill).join(' ').toLowerCase() };
});

function updateSkills() {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  for (const { skill, item, terms } of cards) {
    const matchesCategory = !activeCategory || skill.category === activeCategory;
    const matches = matchesCategory && terms.includes(query);
    item.hidden = !matches;
    if (matches) visible += 1;
  }
  results.textContent = visible ? `共 ${visible} 项 Skill` : '没有符合条件的 Skill';
}

const categoryCounts = new Map([['', skills.length]]);
for (const skill of skills) {
  categoryCounts.set(skill.category, (categoryCounts.get(skill.category) ?? 0) + 1);
}

for (const [category, count] of categoryCounts) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'skill-filter';
  button.textContent = `${category || '全部'} ${count}`;
  button.setAttribute('aria-pressed', String(!category));
  button.setAttribute('aria-controls', grid.id);
  button.addEventListener('click', () => {
    filters.querySelector('[aria-pressed="true"]').setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-pressed', 'true');
    activeCategory = category;
    updateSkills();
  });
  filters.append(button);
}

search.addEventListener('input', updateSkills);
detail.addEventListener('click', (event) => {
  if (event.target === detail) detail.close();
});
updateSkills();
