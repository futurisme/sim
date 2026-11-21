// Contextual Replies & Organic Discourse Engine
import { ASSIGNMENT_TYPES, DISTRICTS } from '../constants.js';
import { assessMemberTrustworthiness, getCircadianProfile } from './hierarchyAi.js';
import { computeSpeechStyle, normalizeIndonesianText } from './nlpParser.js';
import { buildSubServerRecruitmentInvite } from './recruitGuides.js';

function pickVariant(options, seed) {
  if (!options || options.length === 0) return '';
  return options[Math.abs(seed) % options.length];
}

function getRecentChannelTexts(state, channelId, limit = 18) {
  const list = state?.messages?.[channelId] || [];
  return new Set(list.slice(-limit).map((m) => m.text));
}

function applySpeechQuirk(text, speaker, div) {
  if (!text || !speaker?.speechQuirk) return text;
  const q = speaker.speechQuirk;
  if (q === 'radio' && !/^10-4|^86/i.test(text)) {
    return `${div?.callsign ? `[${div.callsign}] ` : '10-4, '}${text}`;
  }
  if (q === 'tegas' && text.length < 130 && !/!$/.test(text)) {
    return text.replace(/\.$/, '!');
  }
  if (q === 'analitis' && !/data|evaluasi|pantauan/i.test(text) && text.length < 120) {
    return `${text} (Sesuai pantauan lapangan)`;
  }
  if (q === 'humoris' && !/[😂🤣🙌🔥🫡🙏]/.test(text) && !text.includes('wkwk')) {
    return `${text} 😄`;
  }
  return text;
}

function pickNonRepeating(candidates, recentSet, seed = 0) {
  const fresh = candidates.filter((c) => c && !recentSet.has(c));
  const pool = fresh.length > 0 ? fresh : candidates;
  return pool[Math.abs(seed) % pool.length] || '';
}
function buildDynamicQaResponse(responder, rawText, state, style) {
  const norm = normalizeIndonesianText(rawText);
  const rank = state.ranks.find((r) => r.id === responder.rankId) || state.ranks[0];
  const prefix =
    style.courtesy === 'SANTUN'
      ? style.register === 'BAKU'
        ? `Mohon izin menanggapi, Kapolda (${rank.name} ${responder.icName.split(' ')[0]}). `
        : 'Siap izin jawab ya Kapolda! '
      : style.courtesy === 'KETUS'
        ? 'Jujur aja ya Komandan, '
        : 'Izin lapor singkat Kapolda: ';

  if (/(abuse|rawan|bahaya|nakal|tidak\s*amanah)/i.test(norm)) {
    const risky = state.members.filter((m) => assessMemberTrustworthiness(m).level === 'RISIKO_ABUSE');
    if (risky.length === 0) {
      return `${prefix}Saat ini seluruh ${state.members.length} personel berstatus aman (tidak ada yang masuk kategori Rawan Abuse).`;
    }
    const names = risky.map((m) => `${m.icName} (Prof ${m.personality?.professionalism ?? 50}%)`).join(', ');
    return `${prefix}Berdasarkan catatan integritas, yang perlu diawasi ketat adalah: ${names}. Sebaiknya jangan diberi izin Kick/Demosi dulu sebelum dididik di Akademi.`;
  }

  if (/(aktif|rajin|terbaik|top|xp\s*tertinggi|paling\s*bagus)/i.test(norm)) {
    const sorted = [...state.members].sort((a, b) => b.xp - a.xp);
    const top = sorted.slice(0, 2).map((m) => `${m.icName} (${Math.round(m.xp)} XP)`).join(' & ');
    return `${prefix}Personel paling aktif saat ini adalah ${top || 'belum tercatat'}. Mereka layak diprioritaskan untuk promosi atau brevet penghargaan.`;
  }

  if (/(divisi|kosong|kurang\s*orang|penuh|slot)/i.test(norm)) {
    const summary = state.divisions
      .map((d) => {
        const c = state.members.filter((m) => m.divisionId === d.id).length;
        return `${d.name} (${c}/${d.quota})`;
      })
      .join(', ');
    return `${prefix}Sebaran divisi saat ini: ${summary}. Jika rata-rata sudah mendekati kuota, sebaiknya buka divisi baru seperti Reskrim atau Brimob.`;
  }

  if (/(betah|keluar|sepi|morale|sedih|bosan|kenapa)/i.test(norm)) {
    const avgBetah = Math.round(
      state.members.reduce((s, m) => s + m.betahScore, 0) / Math.max(1, state.members.length)
    );
    const issues = [];
    if (state.ranks.filter((r) => !r.isOwner).length < 5) issues.push('jenjang pangkat masih sedikit');
    if (state.divisions.length < 3) issues.push('pilihan divisi masih terbatas');
    if (state.billets.every((b) => !b.holderId)) issues.push('belum ada pejabat WAKAPOLRI/Kanit yang dilantik');
    if (state.members.some((m) => m.needsWelcome)) issues.push('ada rekrutan baru yang belum disambut');
    if ((state.tech?.systemHealth ?? 100) < 80) issues.push('stabilitas sistem map 2D perlu di-patch Developer');
    return issues.length > 0
      ? `${prefix}Rata-rata Betah ${avgBetah}%. Faktor yang perlu dibenahi: ${issues.join('; ')}.`
      : `${prefix}Rata-rata Betah personel sangat baik (${avgBetah}%). Pastikan promosi XP dan event komunitas tetap berjalan rutin.`;
  }

  if (/(akademi|taruna|akpol|lemdiklat|lulus)/i.test(norm)) {
    const enrolled = state.members.filter((m) => m.academyStatus === 'ENROLLED');
    if (enrolled.length === 0) {
      return `${prefix}Belum ada Taruna aktif di Akademi Kepolisian saat ini (kuota ${state.academy?.quota || 4}, total alumni ${state.academy?.graduatesCount || 0}).`;
    }
    const list = enrolled.map((c) => `${c.icName} (${Math.round(c.trainingProgress || 0)}%)`).join(', ');
    return `${prefix}Ada ${enrolled.length} Taruna aktif di Kampus Akpol: ${list}. Latih mereka atau tunggu progres 100% untuk wisuda.`;
  }

  if (/(saran|masukan|rekomendasi|butuh\s*apa|selanjutnya)/i.test(norm)) {
    const hasWakapolri = state.billets.some((b) => b.id === 'billet-wakapolri' && b.holderId);
    const hasDev = state.members.some((m) => m.subRole === 'Head Developer' || m.subRole === 'Developer');
    const tips = [];
    if (!hasWakapolri) tips.push('lantik anggota profesional jadi WAKAPOLRI agar rekrutmen & promosi berjalan otonom');
    if (!hasDev) tips.push('berikan sub-jabatan Developer/Helper ke staf tepercaya agar map 2D terus teroptimasi');
    if (state.divisions.length < 3) tips.push('buka divisi baru untuk menampung lonjakan pendaftar');
    if ((state.subServers || []).some((s) => !s.affiliatedToMain)) tips.push('afiliasikan sub-server mandiri agar reputasi & daya tarik naik');
    return tips.length > 0
      ? `${prefix}Saran taktis untuk server saat ini: ${tips.slice(0, 2).join(', dan ')}.`
      : `${prefix}Struktur server sudah sangat solid! Fokus gelar event RP & kirim link rekrutmen sub-server untuk menjaga dinamika anggota.`;
  }

  if (/(kapan|jam\s*malam|tidur|jadwal)/i.test(norm)) {
    const c = getCircadianProfile(state.simSeconds);
    return `${prefix}Sekarang fase ${c.label}. Jam tidur reguler berlaku pukul 23:00–05:00 (hanya unit piket malam & pejabat struktural yang tetap siaga).`;
  }

  return null;
}

export function buildContextualAiReply(responder, intentObj, state, channelId) {
  const { intent, targetMember, targetDistrict, targetSubServer, rawText } = intentObj;
  const circadian = getCircadianProfile(state.simSeconds);
  const style = computeSpeechStyle(responder, state);
  const online2d = state.members.filter((m) => m.status === 'online-2d').length + 1;
  const openCases = state.incidents.length;
  const affCount = (state.subServers || []).filter((s) => s.affiliatedToMain).length;
  const cadetCount = state.members.filter((m) => m.academyStatus === 'ENROLLED').length;
  const recentSet = getRecentChannelTexts(state, channelId, 8);
  const seed = state.nextId + (rawText?.length || 0) + responder.icName.length;

  switch (intent) {
    case 'STATUS_QUERY': {
      if (style.register === 'BAKU') {
        return `Izin melapor Kapolda (${circadian.label}): saat ini terdapat ${online2d} unit aktif di Kota 2D, ${openCases} kasus terbuka, ${state.divisions.length} divisi, ${cadetCount} Taruna Akpol, ${affCount} sub-server terafiliasi, efisiensi map ${Math.round(state.tech.mapEfficiency)}%, serta kesehatan sistem ${Math.round(state.tech.systemHealth)}%.`;
      }
      return `Lapor Kapolda (${circadian.label}): ${online2d} unit aktif patroli di Kota 2D, ${openCases} TKP terbuka, ${state.divisions.length} divisi, ${cadetCount} Taruna Akpol, ${affCount} sub-server terafiliasi, efisiensi map ${Math.round(state.tech.mapEfficiency)}%, kesehatan sistem ${Math.round(state.tech.systemHealth)}%.`;
    }

    case 'QUESTION_ASK': {
      const qa = buildDynamicQaResponse(responder, rawText, state, style);
      if (qa) return qa;
      break;
    }

    case 'HOST_EVENT':
      return pickNonRepeating(
        [
          '86 Kapolda! Tim Panitia Event & personel lapangan siap mengkoordinasikan acara komunitas untuk menaikkan Betah dan Reputasi Kota!',
          'Siap Komandan! Konsep konvoi & latihan gabungan langsung disusun agar seluruh anggota makin kompak dan betah.',
          'Mantap Ndan! Event komunitas kayak gini bikin suasana server hidup lagi, tim siap meramaikan!',
        ],
        recentSet,
        seed
      );

    case 'CREATE_SUB_SERVER':
      return style.register === 'BAKU'
        ? 'Siap dilaksanakan, Kapolda. Struktur sub-server satuan beserta saluran koordinasi internal segera kami aktifkan.'
        : 'Siap Kapolda! Kami siapkan sub-server unit kerja terkait dan langsung sinkronkan dengan server utama.';

    case 'AFFILIATE_SUB_SERVER':
      return 'Copy Kapolda! Tautan afiliasi sub-server divisi sudah dicek dan langsung dikoneksikan dengan Markas Besar.';

    case 'CREATE_DIVISION':
      return style.register === 'BAKU'
        ? 'Siap Komandan, pembukaan divisi baru telah dicatat. Personel siap menyesuaikan penempatan sektor patroli.'
        : 'Mantap Kapolda! Divisi baru kebuka, rekrutan baru makin punya banyak pilihan tugas spesifik di Kota 2D.';

    case 'ADJUST_DIVISION_QUOTA': {
      const tDiv = intentObj.targetDivision;
      return tDiv
        ? `10-4 Kapolda! Batas kuota Divisi ${tDiv.name} kini disesuaikan menjadi ${tDiv.quota} personel agar pemerataan unit makin optimal.`
        : 'Siap Kapolda, kuota divisi telah diperbarui sesuai kapasitas operasional.';
    }

    case 'CONFIGURE_DIVISION_DUTY': {
      const tDiv = intentObj.targetDivision;
      const aMeta = ASSIGNMENT_TYPES[tDiv?.dutyProfile?.assignmentType];
      return tDiv
        ? `Siap dilaksanakan Komandan! Fokus tugas Divisi ${tDiv.name} kini diarahkan ke mode "${aMeta?.label || tDiv.duty}" di peta Kota Izumiya 2D.`
        : 'Siap Komandan! Penugasan rutin divisi telah disesuaikan.';
    }

    case 'CREATE_RANK':
      return 'Siap Komandan! Penambahan jenjang kepangkatan baru langsung memotivasi personel mengejar XP patroli hingga Perwira Tinggi.';

    case 'CREATE_BILLET':
      return 'Siap Kapolda! Jabatan struktural baru sudah tercatat, tinggal menentukan pejabat yang paling amanah.';

    case 'PROMOTE_MEMBER':
      return targetMember
        ? `Selamat buat ${targetMember.icName} atas promosi pangkat barunya! Semoga makin solid di lapangan 🫡`
        : 'Siap Kapolda, keputusan promosi sudah dicatat!';

    case 'DEMOTE_MEMBER':
      return 'Siap Komandan, penegakan disiplin pangkat dilaksanakan sesuai hierarki Mabes.';

    case 'ASSIGN_DIVISION':
      return targetMember
        ? `10-4 Kapolda! Penempatan ${targetMember.icName} ke satuan barunya langsung disesuaikan di koordinasi lapangan.`
        : 'Siap Kapolda, penempatan divisi sudah diperbarui.';

    case 'TOGGLE_PROPAM_GATE':
      return state.mabesSecurity?.gateOpen === false
        ? '86 Kapolda! Gerbang Penjaga Propam dikunci penuh; hanya personel berizin khusus yang dapat melintas.'
        : '10-4 Kapolda! Gerbang Penjaga Propam Mabes kembali dibuka untuk kelancaran giat operasional.';

    case 'ARREST_MEMBER':
      return targetMember
        ? `Siap Propam! ${targetMember.icName} diamankan dan ditempatkan ke Sel Rutan Penjara Mabes untuk pemeriksaan etik.`
        : 'Siap Kapolda, unit Propam melakukan pengamanan tahanan di Rutan Mabes.';

    case 'RELEASE_MEMBER':
      return targetMember
        ? `10-4 Komandan! ${targetMember.icName} resmi dibebaskan dari Sel Penjara Mabes usai masa pembinaan.`
        : 'Siap Kapolda, tahanan Rutan Mabes telah diproses pembebasannya.';

    case 'RECRUIT_SUB_SERVER_LINK': {
      const subName = targetSubServer ? targetSubServer.name : 'satuan kerja';
      return style.register === 'BAKU'
        ? `Siap dilaksanakan, Kapolda. Tautan undangan resmi beserta format pendaftaran & syarat ${subName} telah kami terbitkan di saluran rekrutmen.`
        : `Siap Ndan! Link join ${subName} lengkap sama format daftar & syaratnya sudah kita sebar biar rekan-rekan yang memenuhi kriteria bisa langsung gabung!`;
    }

    case 'DIRECTIVE_APEL':
      return pickNonRepeating(
        [
          '86 Kapolda! Seluruh unit aktif di peta 2D langsung merapat ke lapangan Mabes untuk Apel bersama.',
          'Siap laksanakan Apel! Unit di sektor timur dan selatan segera balik kanan menuju halaman Mabes.',
        ],
        recentSet,
        seed
      );

    case 'DIRECTIVE_RAZIA':
      return targetDistrict
        ? `Siap laksanakan Razia di ${targetDistrict.name}! Unit bergerak menuju titik penyekatan dan pengamanan.`
        : 'Siap laksanakan Razia Gabungan! Seluruh unit patroli menyebar ke simpang utama dan kawasan niaga.';

    case 'DIRECTIVE_PATROL':
      return targetDistrict
        ? `10-4! Tim menggeser fokus patroli ke sektor ${targetDistrict.name} untuk memantau situasi warga.`
        : '10-4 Kapolda! Patroli bebas dilanjutkan ke seluruh ruas jalan Kota Izumiya.';

    case 'TECH_MAINTENANCE':
      return 'Tim Developer/Admin menerima instruksi! Sedang menjalankan pemindaian error, patching map 2D, dan optimasi rute patroli.';

    case 'WARN_MODERATION':
      if (targetMember && responder.id === targetMember.id) {
        return style.register === 'BAKU'
          ? 'Mohon maaf sebesar-besarnya Kapolda, saya menyadari kekhilafan tata krama chat tadi dan siap memperbaiki komunikasi ke depannya.'
          : 'Siap maaf Kapolda! Tadi kelepasan di chat, langsung saya tertibkan sesuai aturan server ya 🙏';
      }
      return style.register === 'BAKU'
        ? '86 Kapolda! Peringatan ketertiban chat dicatat. Seluruh anggota wajib memisahkan jalur OOC dan IC serta menjaga sopan santun.'
        : 'Siap Komandan! Rekan-rekan langsung diingatkan buat jaga etika chat, hindari spam capslock, dan pisahkan IC/OOC.';

    case 'PRAISE_MEMBER':
      if (targetMember) {
        return style.register === 'BAKU'
          ? `Terima kasih atas apresiasi Bapak Kapolda. Dukungan pimpinan sangat memacu semangat ${targetMember.icName} beserta jajaran.`
          : `Wah makasih banyak Kapolda! Apresiasi langsung gini bikin ${targetMember.icName.split(' ')[0]} dan rekan-rekan makin semangat patroli 🙌`;
      }
      break;

    case 'WARM_SOCIAL':
      if (channelId === 'lobi-rekrutmen') {
        return pickNonRepeating(
          [
            'Terima kasih sambutannya Kapolda! Saya langsung aktif di server dan turun ke jalanan Kota 2D.',
            'Siap Kapolda! Senang sekali disambut langsung oleh Owner, izin bergabung di barisan patroli.',
          ],
          recentSet,
          seed
        );
      }
      if (circadian.isNight) {
        return 'Siap Komandan! Meskipun sudah masuk jam malam dan sebagian rekan beristirahat, tim piket malam tetap siaga menjaga kota.';
      }
      return pickVariant(
        [
          'Siap Kapolda! Kompak terus seluruh jajaran Kepolisian Republik Izumiya 🙌',
          'Terima kasih Komandan! Suasana server hari ini terasa makin solid dan kondusif.',
          'Siap Ndan! Semangat terus rekan-rekan di lapangan maupun di markas!',
        ],
        seed
      );

    default:
      break;
  }

  const firstName = responder.icName.split(' ')[0];
  if (circadian.isNight) {
    return style.register === 'BAKU'
      ? `Copy Kapolda, situasi malam hari terpantau kondusif (${openCases} insiden aktif). Unit piket malam tetap bersiaga.`
      : 'Aman Kapolda, walau udah jam malam & sebagian rekan tidur, tim piket malam masih muter pantau jalanan.';
  }

  const genericPool =
    style.register === 'BAKU'
      ? [
          `Siap Kapolda, arahan di #${channelId} kami terima. ${online2d} unit tetap menjaga stabilitas Kota Izumiya.`,
          `Mohon izin Kapolda, ${firstName} standby di jalur koordinasi #${channelId}. Seluruh laporan radio terpantau lancar.`,
          'Dimengerti Komandan. Personel siap menindaklanjuti dinamika di lapangan secara profesional.',
        ]
      : style.register === 'SEMI'
        ? [
            `10-4 Kapolda! Siap pantau terus arahan di #${channelId}, kondisi kota saat ini ${openCases > 2 ? 'agak ramai kasus' : 'cukup aman'}.`,
            'Copy Ndan! Saya lagi keliling dekat pusat kota, kalau ada instruksi lanjutan tinggal ketik di sini ya.',
            'Siap Komandan! Rekan-rekan juga cukup responsif di radio hari ini.',
          ]
        : [
            `Siap bang Kapolda! Gas terus nih di #${channelId}, kota lagi seru-serunya ada ${online2d} unit aktif.`,
            'Oke siap Ndan! Ini lagi nyimak chat sambil jaga rute biar gak ada balap liar lolos.',
            'Mantap Kapolda, kita ikutin arahannya!',
          ];

  return pickNonRepeating(genericPool, recentSet, seed);
}

export function generateOrganicAiChatter(state, rng = Math.random) {
  const speakers = state.members.filter((m) => m.status !== 'offline');
  if (speakers.length === 0) return null;

  const speaker = speakers[Math.floor(rng() * speakers.length)];
  const rank = state.ranks.find((r) => r.id === speaker.rankId) || state.ranks[0];
  const div = speaker.divisionId ? state.divisions.find((d) => d.id === speaker.divisionId) : null;
  const style = computeSpeechStyle(speaker, state);
  const circadian = getCircadianProfile(state.simSeconds);
  const firstName = speaker.icName.split(' ')[0];

  const nonOwnerRanks = state.ranks.filter((r) => !r.isOwner).sort((a, b) => a.order - b.order);
  const nextRank = nonOwnerRanks.find((r) => r.order > rank.order);

  if (nextRank && speaker.xp >= nextRank.minXp && !speaker.promotionAsked) {
    speaker.promotionAsked = true;
    const promoText =
      style.register === 'BAKU'
        ? `Mohon izin Komandan, catatan XP patroli saya telah mencapai ${Math.round(speaker.xp)} XP. Apakah saya sudah layak dipertimbangkan untuk kenaikan pangkat ke ${nextRank.name}?`
        : style.register === 'SEMI'
          ? `Izin Komandan, XP patroli saya sudah ${Math.round(speaker.xp)} nih! Kira-kira sudah bisa naik ke ${nextRank.name} belum ya?`
          : `Ndan, XP saya udah tembus ${Math.round(speaker.xp)} nih wkwk. Boleh kali naik ke ${nextRank.name} biar makin gacor patrolinya!`;
    return {
      channelId: 'obrolan-ooc',
      speaker,
      rank,
      div,
      actionMemberId: speaker.id,
      text: promoText,
    };
  }

  const ownedSub = (state.subServers || []).find((s) => s.ownerId === speaker.id);
  if (ownedSub && rng() < 0.24) {
    const invite = buildSubServerRecruitmentInvite(ownedSub, speaker, state);
    const targetCh = rng() < 0.5 ? 'lobi-rekrutmen' : 'obrolan-ooc';
    const recent = getRecentChannelTexts(state, targetCh, 10);
    if (!recent.has(invite.text)) {
      return {
        channelId: targetCh,
        speaker,
        rank,
        div,
        text: invite.text,
        recruitInvite: invite.recruitInvite,
      };
    }
  }

  const p = speaker.personality || { professionalism: 60, loyalty: 60, activityDrive: 60, ambition: 55, empathy: 60 };
  const openCases = state.incidents.length;
  const sampleDistrict = DISTRICTS[Math.floor(rng() * DISTRICTS.length)];
  const recentOoc = getRecentChannelTexts(state, 'obrolan-ooc', 10);
  const recentPatrol = getRecentChannelTexts(state, 'laporan-patroli', 10);
  const recentLobi = getRecentChannelTexts(state, 'lobi-rekrutmen', 10);
  const isLowBetah = speaker.betahScore < 58;
  const sysLow = (state.tech?.systemHealth ?? 100) < 82;

  const rawViolationRisk =
    (p.professionalism < 60 ? (60 - p.professionalism) * 0.011 : 0) +
    (p.empathy < 55 ? (55 - p.empathy) * 0.008 : 0) +
    (speaker.betahScore < 55 ? 0.08 : 0) +
    (p.ambition >= 80 && p.professionalism < 70 ? 0.07 : 0);

  if (rawViolationRisk > 0.08 && rng() < Math.min(0.45, rawViolationRisk)) {
    const vSeed = Math.floor(rng() * 4);
    if (vSeed === 0) {
      const vPool = [
        'btw gw afk bentar bikin mie ya wkwk, kalo ada tilang ntar nyusul',
        'eh ping gw agak naek nih di map, ada yg ngerasa ngeframe juga gak? wkwk',
        'info cara cepet naikin xp dong min biar gak usah muter-muter pasar terus 😂',
      ];
      return {
        channelId: 'laporan-patroli',
        speaker,
        rank,
        div,
        topicTag: 'RULE_VIOLATION',
        stance: 'RULE_VIOLATION',
        ruleViolation: true,
        violationType: 'OOC_MIXING_IC',
        text: pickNonRepeating(vPool, recentPatrol, state.nextId + vSeed),
      };
    }
    if (vSeed === 1) {
      const vPool = [
        `WOYY DI ${sampleDistrict.name.toUpperCase()} RAME BANGET PELANGGAR!! BACKUP DONGG CEPETTT!!`,
        'GAS TERUS PROMOSINYA MINN!! UDAH NUNGGU DARI TADI NIH WKWK!!',
      ];
      return {
        channelId: 'obrolan-ooc',
        speaker,
        rank,
        div,
        topicTag: 'RULE_VIOLATION',
        stance: 'RULE_VIOLATION',
        ruleViolation: true,
        violationType: 'CAPS_SPAM',
        text: pickNonRepeating(vPool, recentOoc, state.nextId + vSeed),
      };
    }
    if (vSeed === 2) {
      const vPool = [
        'p p p tes sinyal mic masuk gak nih??? sepi amat yg piket',
        'test 123 p p yg gabut mabar yuk abis shift ntar',
      ];
      return {
        channelId: 'lobi-rekrutmen',
        speaker,
        rank,
        div,
        topicTag: 'RULE_VIOLATION',
        stance: 'RULE_VIOLATION',
        ruleViolation: true,
        violationType: 'FLOOD_CHIT_CHAT',
        text: pickNonRepeating(vPool, recentLobi, state.nextId + vSeed),
      };
    }
    const snarkPool = [
      'lama amat responnya nih, keburu kabur semua pelanggarnya deh 😂',
      `heran deh yang piket di ${sampleDistrict.name} pada ngilang ke mana aja sih wkwk`,
    ];
    return {
      channelId: 'obrolan-ooc',
      speaker,
      rank,
      div,
      topicTag: 'RULE_VIOLATION',
      stance: 'RULE_VIOLATION',
      ruleViolation: true,
      violationType: 'MINOR_DISRESPECT_SNARK',
      text: pickNonRepeating(snarkPool, recentOoc, state.nextId + vSeed),
    };
  }

  const needsMoreDivs = state.divisions.length <= 2 && state.members.length >= 4;
  const waitingPromo = Boolean(nextRank && speaker.xp >= nextRank.minXp);
  const protestTrigger =
    isLowBetah || speaker.archetype === 'kritis' || sysLow || needsMoreDivs || waitingPromo;

  if (protestTrigger && rng() < (isLowBetah || speaker.archetype === 'kritis' ? 0.58 : 0.25)) {
    let protestTopic = 'PROTEST_GENERAL';
    let candidates = [];

    if (sysLow) {
      protestTopic = 'PROTEST_TECH';
      candidates =
        style.courtesy === 'KETUS'
          ? [
              `Jujur aja ya, kesehatan sistem map turun ke ${Math.round(state.tech.systemHealth)}%. Kalau belum ada Developer aktif, patroli berasa berat banget.`,
              `Sistem kota drop ke ${Math.round(state.tech.systemHealth)}%, mohon tim teknis segera patch biar koordinasi gak tersendat.`,
            ]
          : [
              `Izin menyampaikan masukan: stabilitas sistem saat ini ${Math.round(state.tech.systemHealth)}%. Semoga Developer/Admin segera beri optimasi.`,
              `Mohon perhatian jajaran teknis, performa peta mulai terasa menurun (${Math.round(state.tech.systemHealth)}%).`,
            ];
    } else if (waitingPromo) {
      protestTopic = 'PROTEST_PROMO';
      candidates =
        style.courtesy === 'KETUS'
          ? [
              `Agak bingung sih, XP sudah tembus ${Math.round(speaker.xp)} tapi SKep promosi ke ${nextRank.name} belum turun juga.`,
              'Kalau yang rajin kejar TKP lama dipromosikan, takutnya semangat patroli rekan lain ikut turun.',
            ]
          : [
              `Izin berpendapat Komandan & WAKAPOLRI, beberapa personel sudah memenuhi syarat XP ${nextRank.name} dan menanti evaluasi promosi.`,
              'Semoga peninjauan kenaikan pangkat bisa rutin dilakukan supaya motivasi anggota tetap tinggi.',
            ];
    } else if (needsMoreDivs) {
      protestTopic = 'PROTEST_DIVISION';
      candidates =
        style.register === 'BAKU'
          ? [
              `Izin menyampaikan evaluasi ringan: jumlah personel terus bertambah sementara pilihan divisi masih ${state.divisions.length} satuan. Pembukaan divisi baru akan membantu pemerataan tugas.`,
              'Mohon pertimbangan pimpinan untuk membuka divisi tambahan seperti Reskrim atau Brimob agar beban patroli tidak menumpuk.',
            ]
          : [
              `Menurut saya pilihan divisi masih agak padat nih cuma ${state.divisions.length} satuan. Kapan ya buka Reskrim atau Brimob biar lebih variatif?`,
              `Sektor ${sampleDistrict.name} mulai rame kasus, kayaknya butuh tambahan divisi baru biar piketnya gak numpuk.`,
            ];
    } else {
      protestTopic = 'PROTEST_MORALE';
      candidates =
        style.courtesy === 'KETUS'
          ? [
              'Jujur akhir-akhir ini ritme tugas berasa monoton kalau belum ada event RP atau brevet penghargaan baru.',
              'Harapannya WAKAPOLRI lebih sering cek lobi & beri arahan langsung biar rekan baru gak bingung mau ngapain.',
            ]
          : [
              'Izin memberi saran ringan: mungkin perlu gelar event konvoi atau latihan gabungan lagi biar suasana makin cair dan betah.',
              `Rekan-rekan di ${sampleDistrict.name} butuh rotasi piket yang lebih merata agar tidak kelelahan di satu titik.`,
            ];
    }

    return {
      channelId: 'obrolan-ooc',
      speaker,
      rank,
      div,
      topicTag: protestTopic,
      stance: 'MILD_PROTEST',
      text: pickNonRepeating(candidates, recentOoc, state.nextId + firstName.length),
    };
  }

  if (rng() < 0.45) {
    const dChoice = Math.floor(rng() * 4);
    let targetChannel = 'obrolan-ooc';
    let topicTag = 'DISCUSSION_COMMUNITY';
    let candidates = [];

    if (dChoice === 0) {
      targetChannel = rng() < 0.5 ? 'laporan-patroli' : 'obrolan-ooc';
      topicTag = 'DISCUSSION_PATROL';
      candidates =
        style.register === 'BAKU'
          ? [
              `Menurut rekan-rekan, apakah pengawasan di ${sampleDistrict.name} saat fase ${circadian.label} sudah optimal dengan ${openCases} kasus aktif?`,
              'Bagaimana evaluasi rekan terkait koordinasi antara Sabhara dan Satlantas saat menangani balap liar di simpang utama?',
              'Rekan Propam rutin menjaga gerbang timur & selatan Mabes—apakah rotasi penjagaan markas sudah cukup merata?',
            ]
          : [
              `Menurut kalian titik paling rawan pelanggaran di jam segini di ${sampleDistrict.name} atau Dermaga Selatan nih?`,
              'Enaknya patroli berdua pakai backup atau nyebar masing-masing sektor biar TKP cepet kelar?',
              'Salut sih sama tim yang jaga gerbang Mabes, jadi aman banget buat koordinasi internal!',
            ];
    } else if (dChoice === 1) {
      topicTag = 'DISCUSSION_CAREER';
      candidates =
        style.register === 'BAKU'
          ? [
              'Rekan-rekan, adakah tips efektif untuk Taruna baru agar cepat memenuhi syarat profesionalisme Akademi Kepolisian?',
              'Berdiskusi ringan: antara mengejar XP TKP dengan mengikuti pembinaan di Akademi, mana yang paling berdampak pada kepemimpinan?',
              'Kalau jenjang pangkat sudah lengkap hingga Jenderal bintang empat, pembagian tanggung jawab perwira pasti jauh lebih terstruktur.',
            ]
          : [
              'Eh guys, menurut kalian lebih worth ngebut XP tilang dulu atau langsung daftar Akpol pas kuota buka?',
              'Kira-kira siapa nih yang paling cocok pegang jabatan strategis atau buka sub-server satuan berikutnya?',
              'Makin banyak divisi spesialis nih, kalian lebih cocok ke bidang lalu lintas, reserse, atau keamanan markas?',
            ];
    } else if (dChoice === 2) {
      topicTag = 'DISCUSSION_COMMUNITY';
      candidates =
        style.register === 'BAKU'
          ? [
              'Bagaimana pendapat rekan apabila akhir pekan ini diadakan konvoi gabungan seluruh divisi dari Mabes menuju Pelabuhan Timur?',
              'Apakah ada rekan yang berencana bergabung ke sub-server divisi untuk mempererat koordinasi internal?',
            ]
          : [
              'Eh seru gak sih kalau nanti kita adain konvoi gabungan keliling Kota Izumiya dari Mabes sampai Dermaga?',
              'Yang udah gabung di sub-server divisi, gimana serunya diskusi di channel internal sana?',
            ];
    } else {
      topicTag = 'DISCUSSION_TECH';
      candidates = [
        `Performa map 2D sekarang di efisiensi ${Math.round(state.tech?.mapEfficiency ?? 100)}%. Menurut kalian jalur persimpangan mana yang paling butuh penertiban?`,
        `Salut buat tim Developer & Helper yang jaga kestabilan sistem kota (${Math.round(state.tech?.systemHealth ?? 100)}%), pergerakan ${speakers.length} unit patroli terasa lancar!`,
      ];
    }

    const recentSet = targetChannel === 'laporan-patroli' ? recentPatrol : recentOoc;
    return {
      channelId: targetChannel,
      speaker,
      rank,
      div,
      topicTag,
      stance: 'DISCUSSION',
      text: applySpeechQuirk(pickNonRepeating(candidates, recentSet, state.nextId + firstName.length), speaker, div),
    };
  }

  let targetChannel = 'obrolan-ooc';
  let candidates = [];
  const divType = div?.dutyProfile?.assignmentType || null;

  if ((speaker.archetype === 'taktis' || divType) && rng() > 0.32) {
    targetChannel = 'laporan-patroli';
    if (divType === 'INTERNAL_SECURITY') {
      candidates =
        style.register === 'BAKU'
          ? [
              `10-4, unit ${div?.callsign || 'PRP'} melakukan penjagaan ketat di Gerbang Timur & Selatan Mabes serta memeriksa kelengkapan atribut personel.`,
              'Patroli dalam kompleks Markas Besar berjalan aman. Kantor Propam dan Sel Rutan terpantau kondusif.',
              'Izin melapor dari Pos Jaga Mabes: lalu-lalang personel di gerbang utama terverifikasi tertib sesuai clearance divisi.',
            ]
          : [
              `Unit ${div?.callsign || 'PRP'} standby di gerbang Mabes, mantau siapa aja yang keluar masuk markas nih.`,
              'Keliling lapangan apel sampai area Rutan Mabes, kondisi dalam markas aman terkendali.',
              'Piket jaga gerbang Propam lagi cek kedisiplinan seragam & ketertiban area Mabes.',
            ];
    } else if (divType === 'TRAFFIC') {
      candidates =
        style.register === 'BAKU'
          ? [
              `Unit ${div?.callsign || 'LNT'} melakukan penguraian kepadatan lalu lintas di Simpang Utama dan jalur niaga Pasar.`,
              'Melaksanakan penindakan pelanggaran marka & antisipasi balap liar di poros jalan protokol kota.',
              `Arus kendaraan di perempatan pusat kota terpantau ramai lancar (${openCases} titik atensi aktif).`,
            ]
          : [
              `Tim ${div?.callsign || 'LNT'} lagi pantau Simpang Utama, hati-hati banyak pelanggar marka & kebut-kebutan di jam segini.`,
              'Habis tilang pengendara ugal-ugalan di jalur Pasar, sekarang lanjut sisir perempatan utama.',
              'Jalur protokol lumayan padat, unit Lantas terus muter jaga kelancaran arus.',
            ];
    } else if (divType === 'MARITIME') {
      candidates = [
        `Unit ${div?.callsign || 'AIR'} menyisir kawasan pesisir Dermaga Selatan & Pelabuhan Logistik Timur; aktivitas bongkar muat aman.`,
        '10-4 dari jalur perairan Dermaga, tidak ditemukan pelanggaran atau pengawalan kargo yang terhambat.',
        'Patroli maritim Dermaga Selatan–Pelabuhan berjalan lancar, cuaca pesisir bersahabat.',
      ];
    } else if (divType === 'INVESTIGATION' || divType === 'INTEL') {
      candidates = [
        `Unit ${div?.callsign || 'RSK'} mengumpulkan keterangan saksi & barang bukti di sekitar ${sampleDistrict.name}.`,
        `Pemantauan senyap di area rawan ${sampleDistrict.name}; mengidentifikasi potensi keributan dini sebelum meluas.`,
        `Koordinasi penyidikan lintas sektor dari ${sampleDistrict.name} menuju pusat data Mabes terpantau sinkron.`,
      ];
    } else if (divType === 'TACTICAL') {
      candidates = [
        `Regu taktis ${div?.callsign || 'BRM'} siap digerakkan cepat ke zona prioritas apabila eskalasi TKP meningkat.`,
        `Penebalan pengamanan di sektor strategis ${sampleDistrict.name} dan kesiagaan Mako 10-4.`,
      ];
    } else if (divType === 'COMMUNITY' || divType === 'MEDICAL' || divType === 'EDUCATION') {
      candidates = [
        `Unit ${div?.callsign || 'POL'} melaksanakan giat pembinaan, sambang warga, & kesiapsiagaan dukungan di ${divType === 'EDUCATION' ? 'Kampus Akpol Timur' : sampleDistrict.name}.`,
        `Menyapa warga di ${sampleDistrict.name} sambil memastikan situasi kamtibmas tetap ramah dan kondusif.`,
      ];
    } else {
      candidates =
        style.register === 'BAKU'
          ? [
              `10-4, unit ${div?.callsign || 'PATROLI'} melakukan penyisiran di sektor ${sampleDistrict.name}. Situasi terpantau ${openCases > 2 ? 'padat insiden' : 'kondusif'}.`,
              `Izin melaporkan dari ${sampleDistrict.name}: arus lalu lintas lancar, personel tetap memantau titik rawan pelanggaran marka.`,
              `Standby di sekitar ${sampleDistrict.name}. Apabila ada eskalasi balap liar, mohon rekan terdekat merapat ke koordinat.`,
            ]
          : [
              `Unit ${div?.callsign || 'PATROLI'} lagi mantau ${sampleDistrict.name}, sementara aman terkendali.`,
              `Info rekan, di ${sampleDistrict.name} ada ${openCases} titik rawan, yang dekat tolong bantu pantau ya.`,
              '10-4, kesiapan radio & pergerakan di map 2D hari ini berasa sinkron dan solid.',
            ];
    }
  } else if (speaker.archetype === 'ambisius') {
    candidates =
      style.register === 'BAKU'
        ? [
            `Fokus menjaga konsistensi patroli hari ini. Target pribadi saya bisa menembus kualifikasi ${nextRank ? nextRank.name : 'Perwira Tinggi'} dengan catatan etik bersih.`,
            `Siap bersaing sehat mengejar prestasi brevet di satuan ${div ? div.name : 'operasional'}. Semangat rekan-rekan!`,
          ]
        : [
            `Gas terus patroli di ${sampleDistrict.name} biar XP cepat naik dan bisa nyusul ${nextRank ? nextRank.name : 'pangkat atas'}!`,
            `Ayo dong divisi ${div ? div.name : 'kita'} jadi yang paling aktif minggu ini!`,
          ];
  } else if (circadian.isNight) {
    candidates =
      style.register === 'BAKU'
        ? [
            `Selamat malam rekan piket. Tetap jaga kewaspadaan di ruas jalan ${sampleDistrict.name} sembari menunggu pergantian shift pagi.`,
            'Suasana malam Izumiya cukup tenang. Terima kasih bagi rekan yang masih berpatroli di jam rawan.',
          ]
        : [
            `Yang masih melek piket malam semangat yaa, ngopi dulu biar gak ngantuk di ${sampleDistrict.name} wkwk.`,
            'Sepi-sepi gini enak buat patroli santai sambil ngobrol di OOC nih.',
          ];
  } else {
    candidates =
      style.register === 'BAKU'
        ? [
            `Selamat ${circadian.hour < 12 ? 'pagi' : 'siang'} rekan-rekan Kepolisian Republik Izumiya. Mari kita jaga kekompakan di dalam maupun luar dinas.`,
            'Apabila ada Taruna atau anggota baru yang membutuhkan panduan rute di Kota 2D, silakan hubungi saya ya.',
          ]
        : [
            `Halo semuanya! Yang baru join jangan sungkan nimbrung di chat atau ikut keliling ke ${sampleDistrict.name} ya!`,
            `Seru banget lihat ${speakers.length} unit patroli makin ramai di peta 2D hari ini 🙌`,
            `Baru kelar muter di ${sampleDistrict.name}, rehat sebentar di kantin Mabes sebelum lanjut giat lagi.`,
          ];
  }

  const recentSet = targetChannel === 'laporan-patroli' ? recentPatrol : recentOoc;
  const text = applySpeechQuirk(pickNonRepeating(candidates, recentSet, state.nextId + firstName.length), speaker, div);
  return {
    channelId: targetChannel,
    speaker,
    rank,
    div,
    topicTag: 'CHATTER',
    stance: 'NEUTRAL',
    text,
  };
}
