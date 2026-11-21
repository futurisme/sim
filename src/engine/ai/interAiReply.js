// Inter-AI Contextual Reply Generator
import { computeSpeechStyle } from './nlpParser.js';
import { checkSubServerEligibility } from './recruitGuides.js';

export function generateInterAiReply(responder, triggerMsg, state, channelId, rng = Math.random) {
  if (!responder || !triggerMsg || triggerMsg.authorId === responder.id || triggerMsg.isSystem) return null;
  if (triggerMsg.authorId === 'owner') return null;

  const rank = state.ranks.find((r) => r.id === responder.rankId) || state.ranks[0];
  const div = responder.divisionId ? state.divisions.find((d) => d.id === responder.divisionId) : null;
  const billet = responder.billetId ? state.billets.find((b) => b.id === responder.billetId) : null;
  const p = responder.personality || { professionalism: 60, loyalty: 60, activityDrive: 60, ambition: 55, empathy: 60 };
  const style = computeSpeechStyle(responder, state);
  const targetFirst = String(triggerMsg.authorName || 'Rekan').split(' ')[0];
  const snippet = String(triggerMsg.text || '').slice(0, 72) + (String(triggerMsg.text || '').length > 72 ? '...' : '');
  const replyMeta = {
    messageId: triggerMsg.id,
    authorId: triggerMsg.authorId,
    authorName: triggerMsg.authorName,
    snippet,
  };

  if (triggerMsg.recruitInvite) {
    const sub = (state.subServers || []).find((s) => s.id === triggerMsg.recruitInvite.subServerId);
    if (sub && !sub.memberIds.includes(responder.id)) {
      const check = checkSubServerEligibility(responder, sub, state);
      const filledForm = [
        `Izin mendaftar ${sub.name} kak ${targetFirst}!`,
        `• Nama IC / Username: ${responder.icName} (@${responder.username})`,
        `• Pangkat & Divisi: ${rank.name}${div ? ` · ${div.name}` : ''}`,
        `• Jam Aktif: ${responder.nightOwl ? 'Piket Malam & Siang' : 'Pagi s/d Prime Time'}`,
        `• Motivasi: Siap berkontribusi aktif dan menjaga nama baik ${sub.shortCode}.`,
      ].join('\n');

      return {
        text: filledForm,
        replyTo: {
          messageId: triggerMsg.id,
          authorId: triggerMsg.authorId,
          authorName: triggerMsg.authorName,
          snippet: `Undangan ${sub.name} [${sub.shortCode}]`,
        },
        applicationForSubServerId: sub.id,
        applicationEligible: check.eligible,
        applicationReasons: check.reasons,
      };
    }
  }

  if (triggerMsg.isAkpolRequest) {
    return {
      text:
        style.register === 'BAKU'
          ? `10-4 Taruna ${targetFirst}, #request pelatihan Akpol telah diterima. Pelatih Lemdiklat segera menuju Lapangan Baris-Berbaris!`
          : `Siap ${targetFirst}! Panggilan #request Akpol sudah masuk, pelatih langsung turun memimpin baris-berbaris 🫡`,
      replyTo: replyMeta,
    };
  }

  if (triggerMsg.applicationForSubServerId) {
    const sub = (state.subServers || []).find((s) => s.id === triggerMsg.applicationForSubServerId);
    const responderCanManage =
      sub && (sub.ownerId === responder.id || Boolean(sub.memberRoles?.[responder.id]?.canManageSubServer));
    if (responderCanManage) {
      const applicant = state.members.find((m) => m.id === triggerMsg.authorId);
      if (applicant) {
        const check = checkSubServerEligibility(applicant, sub, state);
        if (check.eligible) {
          if (!sub.memberIds.includes(applicant.id)) {
            sub.memberIds.push(applicant.id);
            sub.memberRoles[applicant.id] = {
              roleName: 'Anggota Terverifikasi',
              color: sub.color,
              canManageSubServer: false,
              canAffiliate: false,
              badge: null,
            };
            applicant.betahScore = Math.min(100, (applicant.betahScore ?? 65) + 6);
            if (sub.id === 'sub-akademi') applicant.akpolRegistered = true;
          }
          return {
            text:
              style.register === 'BAKU'
                ? `Berkas pendaftaran ${targetFirst} telah kami verifikasi dan memenuhi seluruh syarat ${sub.shortCode}. Selamat bergabung di sub-server ${sub.name}!`
                : `Mantap ${targetFirst}, syaratmu sudah lolos semua! Kamu resmi saya masukkan ke sub-server ${sub.name} ya 🫡`,
            replyTo: replyMeta,
          };
        }
        return {
          text:
            style.courtesy === 'SANTUN'
              ? `Terima kasih atas minatnya, ${targetFirst}. Untuk sementara pendaftaran ${sub.shortCode} belum bisa disetujui karena: ${check.reasons[0]}. Terus tingkatkan di patroli & Akademi ya!`
              : `Maaf ${targetFirst}, untuk masuk ${sub.shortCode} syaratnya belum terpenuhi (${check.reasons[0]}). Tingkatkan dulu statnya lalu daftar ulang.`,
          replyTo: replyMeta,
        };
      }
    }
  }

  if (triggerMsg.ruleViolation) {
    const isModOrSenior =
      Boolean(billet?.permissions?.canMuteChat) ||
      responder.subRole === 'Mod' ||
      responder.subRole === 'Admin' ||
      responder.subRole === 'Helper' ||
      p.professionalism >= 68;

    if (isModOrSenior) {
      triggerMsg.moderated = true;
      const vt = triggerMsg.violationType;
      let modText = '';
      if (vt === 'OOC_MIXING_IC') {
        modText =
          style.register === 'BAKU'
            ? `Mohon perhatian rekan ${targetFirst}, saluran ini khusus laporan IC radio. Untuk obrolan AFK/OOC silakan gunakan #obrolan-ooc atau tanda ((OOC)).`
            : `Waduh ${targetFirst}, jangan campur chat OOC/AFK di channel IC dong—pindah ke #obrolan-ooc ya biar rapi!`;
      } else if (vt === 'CAPS_SPAM') {
        modText =
          style.courtesy === 'SANTUN'
            ? `Pelan-pelan ${targetFirst}, tolong matikan capslock dan kurangi tanda seru berulang supaya chat enak dibaca ya 🙏`
            : `Tolong tertib ${targetFirst}, jangan spam capslock beruntun di channel Discord.`;
      } else if (vt === 'FLOOD_CHIT_CHAT') {
        modText = `Jangan flood "p p" atau ajakan di luar topik di sini ya ${targetFirst}, biar info rekrutmen/koordinasi tidak ketutup.`;
      } else {
        modText =
          style.register === 'BAKU'
            ? `Mohon jaga etika dan nada komunikasi rekan ${targetFirst}. Sampaikan kritik dengan santun melalui jalur komando.`
            : `Sabar bro ${targetFirst}, jaga omongan di chat ya—semua tim lagi berusaha koordinasi di kota.`;
      }
      return { text: modText, replyTo: replyMeta, isModerationReply: true };
    }

    const playful = [
      `Wkwk santai aja kali ${targetFirst}, asal jangan sampe kena tegur Mod atau Propam 🤣`,
      `Waduh ${targetFirst}, ati-ati kebaca Kapolda tuh di chat wkwk`,
    ];
    return { text: playful[Math.floor(rng() * playful.length)], replyTo: replyMeta };
  }

  if (triggerMsg.stance === 'MILD_PROTEST' || triggerMsg.topicTag?.startsWith('PROTEST_')) {
    const isLeaderOrLoyal = Boolean(billet) || p.loyalty >= 74 || p.empathy >= 75;
    if (isLeaderOrLoyal) {
      const mediateMap = {
        PROTEST_TECH: `Aspirasi soal kestabilan sistem itu valid ${targetFirst}. Mari kita dorong agar Developer segera diberi akses atau patch oleh Kapolda.`,
        PROTEST_PROMO: `Masukan yang baik ${targetFirst}. Memang promosi butuh verifikasi jenjang & etika—kalau WAKAPOLRI sudah ditunjuk, prosesnya bakal jauh lebih cepat.`,
        PROTEST_DIVISION: `Sepakat ${targetFirst}, penambahan divisi memang penting saat anggota makin ramai. Semoga Kapolda segera menyetujui usulan Reskrim/Brimob.`,
        PROTEST_MORALE: `Terima kasih masukannya ${targetFirst}, ide event komunitas & pembinaan berkala sangat membantu menjaga semangat seluruh anggota.`,
      };
      return {
        text: mediateMap[triggerMsg.topicTag] || `Poin yang masuk akal, ${targetFirst}. Mari sampaikan aspirasi secara konstruktif agar jajaran pimpinan cepat merespons.`,
        replyTo: replyMeta,
      };
    }

    if (responder.archetype === 'kritis' || responder.betahScore < 62 || p.ambition >= 75) {
      const echoPool = [
        `Bener juga kata ${targetFirst}, saya juga ngerasa perlu pembaruan struktur biar ritme patroli makin kerasa hasilnya.`,
        `Setuju banget sama ${targetFirst}! Apalagi kalau jam ramai, pembagian divisi & apresiasi itu ngaruh banget ke betah anggota.`,
      ];
      return { text: echoPool[Math.floor(rng() * echoPool.length)], replyTo: replyMeta };
    }

    return {
      text: `Sabar dulu ${targetFirst}, sambil kita jaga kinerja di Kota 2D supaya evaluasi Kapolda melihat kesiapan kita.`,
      replyTo: replyMeta,
    };
  }

  if (triggerMsg.topicTag?.startsWith('DISCUSSION_')) {
    if (triggerMsg.topicTag === 'DISCUSSION_PATROL') {
      const patrolDiscuss =
        p.activityDrive >= 75
          ? [
              `Kalau menurutku mending sebar tiap sektor dulu ${targetFirst}, nanti begitu ada kasus berat baru panggil backup lewat tombol kota!`,
              `Setuju ${targetFirst}! Dari pantauan tadi Simpang Utama & Pasar memang titik paling cepat memicu tilang di jam sibuk.`,
            ]
          : [
              `Menurut saya ${targetFirst}, patroli berpasangan lebih aman apalagi kalau kesehatan sistem lagi turun atau malam hari.`,
              `Betul tuh ${targetFirst}, jangan lupa pantau Dermaga Selatan juga karena sering sepi pengawasan pas siang.`,
            ];
      return { text: patrolDiscuss[Math.floor(rng() * patrolDiscuss.length)], replyTo: replyMeta };
    }

    if (triggerMsg.topicTag === 'DISCUSSION_CAREER') {
      const careerDiscuss =
        p.professionalism >= 72
          ? [
              `Saran saya buat Taruna: jangan cuma kejar XP, jaga konsistensi profesionalisme agar lolos seleksi Akpol & layak pegang jabatan!`,
              'Betul, Akademi Kepolisian ngasih lonjakan profesionalisme & loyalitas yang kepake banget buat karier perwira.',
            ]
          : [
              `Kalau kata aku sih kejar TKP bareng aja ${targetFirst}, XP naik cepet sekaligus bantu reputasi kota naik terus!`,
              'Yang penting rajin aktif di map 2D & jaga komunikasi di Discord, nanti pimpinan juga pasti notice kok.',
            ];
      return { text: careerDiscuss[Math.floor(rng() * careerDiscuss.length)], replyTo: replyMeta };
    }

    if (triggerMsg.topicTag === 'DISCUSSION_COMMUNITY') {
      const commDiscuss = [
        `Gass banget ${targetFirst}! Konvoi dari Mabes ke Pelabuhan pasti bikin foto bareng & suasana OOC makin hidup 🙌`,
        `Seru tuh ${targetFirst}! Sekalian ajak Taruna baru biar langsung kenal rute semua distrik.`,
      ];
      return { text: commDiscuss[Math.floor(rng() * commDiscuss.length)], replyTo: replyMeta };
    }

    if (triggerMsg.topicTag === 'DISCUSSION_TECH') {
      const techReply =
        responder.subRole === 'Head Developer' || responder.subRole === 'Developer'
          ? `Terima kasih apresiasinya ${targetFirst}! Selaku ${responder.subRole}, saya terus memantau jalur lalu lintas map agar tidak ada bug.`
          : `Iya berasa banget bedanya ya ${targetFirst}, sejak tim staf aktif jalanan Kota 2D jadi jauh lebih lancar!`;
      return { text: techReply, replyTo: replyMeta };
    }
  }

  if (channelId === 'laporan-patroli' || /10-4|tkp|simpang|pasar|dermaga|backup|razia/i.test(triggerMsg.text)) {
    const tacReplies =
      style.register === 'BAKU'
        ? [
            `Copy ${targetFirst}, unit ${div?.callsign || 'cadangan'} siap membackup apabila situasi di sektor tersebut meningkat.`,
            `10-4 rekan ${targetFirst}. Posisi kami berada di jalur penghubung dan memantau frekuensi radio yang sama.`,
          ]
        : [
            `86 ${targetFirst}! Aman ya di sana? Kalau butuh bantuan tinggal panggil aja, saya lagi deket.`,
            `Copy ${targetFirst}, mantap koordinasinya! Hati-hati di persimpangan sering ada pelanggar ngebut.`,
          ];
    return {
      text: tacReplies[Math.floor(rng() * tacReplies.length)],
      replyTo: replyMeta,
    };
  }

  if (/xp|naik\s*pangkat|promosi/i.test(triggerMsg.text)) {
    const senior = Boolean(responder.billetId) || rank.order >= 3;
    const text = senior
      ? style.register === 'BAKU'
        ? `Benar ${targetFirst}, pencapaian XP tersebut sudah menjadi pertimbangan pimpinan. Tetap jaga integritas dan kinerja lapangan.`
        : `Semangat ${targetFirst}! Bentar lagi pasti diproses sama pimpinan atau WAKAPOLRI kalau kinerjamu konsisten.`
      : `Wah mantap ${targetFirst}, XP-nya ngebut banget! Semoga cepat dilantik naik pangkat ya 🔥`;
    return { text, replyTo: replyMeta };
  }

  const banter =
    style.register === 'BAKU'
      ? [
          `Sepakat dengan rekan ${targetFirst}. Mari kita jaga soliditas tim Kepolisian Republik Izumiya hari ini.`,
          `Terima kasih atas semangatnya, ${targetFirst}. Semoga giat patroli berjalan lancar dan aman.`,
        ]
      : style.register === 'SEMI'
        ? [
            `Bener banget ${targetFirst}! Hari ini kerasa kompak banget anak-anak di kota.`,
            `Siap ${targetFirst}, nanti kita ketemu di sekitar Simpang Utama atau kantin Mabes ya!`,
          ]
        : [
            `Wkwk iya bener tuh ${targetFirst}, gas terus jangan kasih kendor!`,
            `Setuju bro ${targetFirst}! Kapan-kapan kita konvoi bareng satu divisi.`,
          ];

  return {
    text: banter[Math.floor(rng() * banter.length)],
    replyTo: replyMeta,
  };
}
