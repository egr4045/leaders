const fs = require('fs');
const path = require('path');

const stubs = {
  am_car_chaos: "Пробки Еревана", am_cheap_cognac: "Дешёвый Коньяк",
  am_cognac_regulated: "Регулирование Коньяка", am_corruption_high: "Высокая Коррупция",
  am_diaspora_angry: "Диаспора Злится", am_diaspora_in_power: "Диаспора у Власти",
  am_export_crisis: "Кризис Экспорта", am_export_saved: "Экспорт Спасён",
  am_isolated: "Изоляция", am_it_hub: "IT-Хаб Армении", am_it_left: "IT Ушёл",
  am_modern_army: "Современная Армия", am_new_buses: "Новые Автобусы",
  am_north_ally: "Северный Союзник", am_paid_parking: "Платная Парковка",
  am_premium_cognac: "Премиальный Коньяк", am_self_reliant: "Самодостаточность",
  am_transport_monopoly: "Монополия Транспорта", am_west_ally: "Западный Союзник",
  de_army_fund: "Оборонный Фонд", de_closed_borders: "Закрытые Границы",
  de_coal_revival: "Возрождение Угля", de_eu_payer: "Плательщик ЕС",
  de_eu_strict: "Строгий ЕС", de_ev_transition: "Переход на ЭТ",
  de_green_pioneer: "Зелёный Пионер", de_ice_defender: "Защитник ДВС",
  de_skilled_migrants: "Квалифицированные Мигранты",
  il_army_crisis: "Армейский Кризис", il_haredim_riots: "Бунт Харедим",
  il_laser_shield: "Лазерный Щит", il_peace_process: "Мирный Процесс",
  il_reform_paused: "Реформа Приостановлена", il_reform_protests: "Протесты Реформы",
  il_secular_anger: "Гнев Светских", il_settlements_growing: "Рост Поселений",
  il_tech_exodus: "Утечка IT", il_tech_hub: "Кремниевый Вади",
  il_war_state: "Состояние Войны",
  in_ai_hub: "ИИ-Хаб", in_border_war: "Пограничная Война", in_censorship: "Цензура",
  in_corp_farming: "Корпоративное Фермерство", in_farmers_happy: "Довольные Фермеры",
  in_free_cinema: "Свободное Кино", in_global_cinema: "Глобальное Кино",
  in_mars_power: "Марсианская Держава", in_peace_talks: "Мирные Переговоры",
  in_scam_hub: "Центр Мошенничества", in_tech_clean: "Чистые Технологии",
  jp_4day_week: "4-Дневная Неделя", jp_ai_society: "ИИ-Общество", jp_casinos: "Казино",
  jp_naval_power: "Морская Мощь", jp_overwork: "Переработки",
  jp_remilitarization: "Ремилитаризация", jp_robot_care: "Роботы-Сиделки",
  jp_trade_war: "Торговая Война", jp_water_dump: "Слив Воды", jp_yakuza_war: "Война Якудза",
  ru_asian_gas: "Азиатский Газ", ru_cheburnet: "Чебурнет",
  ru_import_sub: "Импортозамещение", ru_local_gas: "Газификация",
  ru_mat_capital: "Маткапитал", ru_migrants: "Трудовые Мигранты",
  ru_oligarch_pact: "Пакт с Олигархами", ru_parallel_import: "Параллельный Импорт",
  ru_state_capitalism: "Госкапитализм", ru_vpn_era: "Эпоха VPN",
  uk_border_crisis: "Кризис Границы", uk_nhs_saved: "NHS Спасена",
  uk_pariah_state: "Государство-Изгой", uk_republic_vote: "Голосование за Республику",
  uk_republican_rise: "Рост Республиканизма", uk_rwanda_plan: "План Руанда",
  uk_scot_ref_active: "Референдум Шотландии", uk_tax_revolt: "Налоговый Бунт",
  uk_us_trade_war: "Торговая Война с США", uk_us_vassal: "Вассал США"
};

const dir = path.join(__dirname, '..', 'content', 'statuses');
let n = 0;
for (const [id, name] of Object.entries(stubs)) {
  const p = path.join(dir, id + '.json');
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify({ id, name, type: 'special', effects: {} }, null, 2) + '\n');
    n++;
    console.log('created', id);
  }
}
console.log('Total created:', n);
