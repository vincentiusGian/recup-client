import { useState, useEffect, useCallback, useMemo } from 'react'
import { getCompetitions } from '../api/competitions';
import axiosInstance from '../api/axiosInstance';
import '../css/home.css';
import Swal from 'sweetalert2';


const Home = () => {
  const [compData, setCompData] = useState([]);
  const [snapToken, setSnapToken] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [teamLeader, setTeamLeader] = useState({
    name: '',
    phone: '',
    photo: null,
    surat: null,
    pakta: null
  });

  const [teamMembers, setTeamMembers] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [selectedCompetition, setSelectedCompetition] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null);

  const competitionsWithoutSchool = useMemo(() => [
    "Modern Dance",
    "Band",
    "English Debate"
  ], []);

  const shouldShowSchool = !competitionsWithoutSchool.includes(selectedCompetition);

  const totalFee = useMemo(() => {
    if (!selectedCompetition) return 0;

    const competition = compData.find(c =>
      (c.name || c.title || c) === selectedCompetition
    );

    if (!competition) return 0;

    const baseFee = competition.fee || 0;
    const totalPeople = teamMembers.length + 1;

    if (selectedCompetition === "Short Movie") {
      const FREE_MEMBERS = 5;
      const EXTRA_FEE_PER_PERSON = 20000;

      if (totalPeople <= FREE_MEMBERS) {
        return baseFee;
      } else {
        const extraPeople = totalPeople - FREE_MEMBERS;
        return baseFee + (extraPeople * EXTRA_FEE_PER_PERSON);
      }
    }

    return baseFee;
  }, [selectedCompetition, teamMembers.length, compData]);

  const addTeamMember = useCallback(() => {
    const maxMembersMap = {
      "Basket Putra": 12,
      "Basket Putri": 12,
      "Voli Putra": 12,
      "Voli Putri": 12,
      "Futsal Putra SMP": 12,
      "Futsal Putra SMA": 12,
      "E-sport MLBB SMP": 7,
      "E-sport MLBB SMA": 7,
      "Modern Dance": 10,
      "KIR": 3,
      "Band": 7,
      "English Debate": 3,
    };

    const maxMembers = maxMembersMap[selectedCompetition] || 100;

    if (teamMembers.length >= maxMembers - 1) {
      Swal.fire({ icon: 'warning', title: 'Batas Anggota Tercapai', text: `Maksimal ${maxMembers} orang (termasuk ketua) untuk ${selectedCompetition}.`, confirmButtonColor: '#facc15' });
      return;
    }

    setTeamMembers(prev => [...prev, { name: '', phone: '', photo: null, surat: null, pakta: null }]);
  }, [selectedCompetition, teamMembers.length]);

  const updateTeamMember = useCallback((index, field, value) => {
    setTeamMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeTeamMember = useCallback((index) => {
    setTeamMembers(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateTeamLeader = useCallback((field, value) => {
    setTeamLeader(prev => ({ ...prev, [field]: value }));
  }, []);

  const addOfficial = useCallback((role) => {
    setOfficials(prev => [...prev, { role, name: '', phone: '', photo: null }]);
  }, []);

  const updateOfficial = useCallback((index, field, value) => {
    setOfficials(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeOfficial = useCallback((index) => {
    setOfficials(prev => prev.filter((_, i) => i !== index));
  }, []);

  function loadMidtransScript(clientKey) {
    return new Promise((resolve) => {
      if (document.querySelector('script[src*="snap.js"]')) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
      script.setAttribute("data-client-key", clientKey);
      script.async = true;
      script.onload = resolve;
      document.body.appendChild(script);
    });
  }

  const handlePayment = useCallback((token) => {
    if (!window.snap) {
      Swal.fire({ icon: 'error', title: 'Sistem Pembayaran Belum Siap', text: 'Silakan refresh halaman dan coba lagi.', confirmButtonColor: '#ef4444' }); return;
    }

    setPaymentPending(true);

    window.snap.pay(token, {
      onSuccess: function (result) {
        console.log('Payment success:', result);
        Swal.fire({
          icon: 'success',
          title: 'Pembayaran Berhasil!',
          text: 'Terima kasih, pembayaran Anda telah dikonfirmasi 🎉',
          confirmButtonColor: '#3b82f6'
        });

        setPaymentPending(false);
        setPendingRegistration(null);
        setSnapToken(null);
        setIsModalOpen(false);

        setTeamLeader({ name: '', phone: '', photo: null, surat: null, pakta: null });
        setTeamMembers([]);
        setOfficials([]);
        setSelectedCompetition("");
      },
      onPending: function (result) {
        console.log('Payment pending:', result);
        Swal.fire({ icon: 'info', title: 'Menunggu Pembayaran', text: 'Silakan selesaikan pembayaran Anda melalui Midtrans.', confirmButtonColor: '#3b82f6' }); setPaymentPending(false);
      },
      onError: function (result) {
        console.error('Payment error:', result);
        Swal.fire({ icon: 'error', title: 'Pembayaran Gagal', text: 'Silakan coba lagi atau hubungi panitia.', confirmButtonColor: '#ef4444' });
        setPaymentPending(false);
      },
      onClose: function () {
        console.log('Payment popup closed');
        setPaymentPending(false);
      }
    });
  }, []);

  useEffect(() => {
    if (snapToken && !paymentPending && pendingRegistration) {
      handlePayment(snapToken);
    }
  }, [snapToken, paymentPending, pendingRegistration, handlePayment]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const competitions = await getCompetitions();

        if (isMounted) {
          let competitionsList = [];

          if (Array.isArray(competitions)) {
            competitionsList = competitions;
          } else if (competitions?.competitions && Array.isArray(competitions.competitions)) {
            competitionsList = competitions.competitions;
          } else if (competitions?.data && Array.isArray(competitions.data)) {
            competitionsList = competitions.data;
          }

          setCompData(competitionsList);
        }
      } catch (err) {
        console.error("Failed to fetch competitions:", err);
        if (isMounted) {
          setCompData([]);
        }
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    loadMidtransScript("Mid-client-IhCJXEB_N1fqjAR_");
  }, []);

  return (
    <>
      <div className="recup-container">
        <div className="liquid-bg">
          <div className="liquid-shape shape-1"></div>
          <div className="liquid-shape shape-2"></div>
          <div className="liquid-shape shape-3"></div>
          <div className="liquid-shape shape-4"></div>
        </div>

        <section className="landing-ael">
          <div className="sunray-overlay">
            <img
              src="./assets/recup/overlay.webp"
              alt="Sunray Overlay"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="title-greek-container">
            <div className="main-title-greek">
              <img
                src="./assets/recup/title.webp"
                alt="Event Title"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>

          <div className="middle-greek-container">
            <div className="sunray-greek">
              <img
                src="./assets/recup/sunray.webp"
                alt="Sunray"
                className="spin"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="building-greek-container">
              <img
                src="./assets/recup/building.webp"
                alt="Greek Building"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>

          <div className="clouds-greek-container">
            <div className="cloud-greek-left">
              <img src="./assets/recup/cloud.webp" alt="Cloud Left" loading="lazy" decoding="async" />
            </div>
            <div className="cloud-greek-right">
              <img src="./assets/recup/cloud.webp" alt="Cloud Right" loading="lazy" decoding="async" />
            </div>
          </div>

          <div className="buttons-greek-container">
            <div className="top-button-greek">
              <button onClick={() => setIsModalOpen(true)}>Registration</button>
              <button>Info Lomba</button>
            </div>
            <div className="bottom-button-greek">
              <button>Guidebook</button>
            </div>
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!submitting && !paymentPending) {
              setIsModalOpen(false);
            }
          }}
        >
          <div
            className="registration-modal glass-effect"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '90vh',
              overflowY: 'auto',
              width: '90%',
              maxWidth: '800px',
              margin: '0 auto'
            }}
          >
            <div className="modal-header" style={{
              position: 'sticky',
              top: 0,
              background: 'transparent',
              backdropFilter: 'blur(10px)',
              zIndex: 10,
              padding: '1.5rem',
              borderBottom: 'none'
            }}>
              <h2 style={{ margin: 0, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>Registration Form</h2>
              <button
                className="close-btn"
                onClick={() => {
                  if (!submitting && !paymentPending) {
                    setIsModalOpen(false);
                  }
                }}
                aria-label="Close modal"
                disabled={submitting || paymentPending}
                style={{
                  opacity: (submitting || paymentPending) ? 0.5 : 1,
                  cursor: (submitting || paymentPending) ? 'not-allowed' : 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-content" style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
              <form className="registration-form" onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);

                try {
                  const formData = new FormData(e.target);

                  const competition = compData.find(c =>
                    (c.name || c.title || c) === selectedCompetition
                  );

                  formData.append('competition_id', competition?.id || 1);
                  formData.append('total_fee', totalFee);
                  formData.append('total_members', teamMembers.length + 1);

                  const allMembers = [
                    {
                      name: teamLeader.name,
                      phone: teamLeader.phone,
                      is_leader: true
                    },
                    ...teamMembers.map(m => ({
                      name: m.name,
                      phone: m.phone,
                      is_leader: false
                    }))
                  ];
                  formData.append('team_members', JSON.stringify(allMembers));

                  const officialsData = officials.map(o => ({
                    role: o.role,
                    name: o.name,
                    phone: o.phone
                  }));
                  formData.append('officials', JSON.stringify(officialsData));

                  if (teamLeader.photo) formData.append(`leader_photo`, teamLeader.photo);
                  if (teamLeader.surat) formData.append(`leader_surat`, teamLeader.surat);
                  if (teamLeader.pakta) formData.append(`leader_pakta`, teamLeader.pakta);

                  teamMembers.forEach((member, idx) => {
                    if (member.photo) formData.append(`member_${idx}_photo`, member.photo);
                    if (member.surat) formData.append(`member_${idx}_surat`, member.surat);
                    if (member.pakta) formData.append(`member_${idx}_pakta`, member.pakta);
                  });

                  officials.forEach((official, idx) => {
                    if (official.photo) formData.append(`official_${idx}_photo`, official.photo);
                  });

                  const response = await axiosInstance.post('/registrationdata', formData, {
                    headers: {
                      'Content-Type': 'multipart/form-data'
                    }
                  });

                  if (response.data.snap_token) {
                    setSnapToken(response.data.snap_token);
                    setPendingRegistration(response.data);
                    setSubmitting(false);
                    handlePayment(response.data.snap_token);
                  } else {
                    throw new Error('No snap token received');
                  }

                } catch (error) {
                  console.error('Registration failed:', error);
                  setSubmitting(false);
                  setPaymentPending(false);
                  Swal.fire({ icon: 'error', title: 'Registrasi Gagal', text: 'Terjadi kesalahan. Silakan coba lagi.', confirmButtonColor: '#ef4444' });
                }
              }}>
                <div className="form-group">
                  <label>Pilih Kompetisi</label>
                  <div className="custom-dropdown">
                    <select
                      name="competition"
                      className="dropdown-select"
                      value={selectedCompetition}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedCompetition(value);
                        setTeamLeader({ name: '', phone: '', photo: null, surat: null, pakta: null });
                        setTeamMembers([]);
                        setOfficials([]);
                      }}
                      required
                      disabled={submitting || paymentPending}
                    >
                      <option value="">-- Pilih Kompetisi --</option>
                      {compData && compData.length > 0 ? (
                        compData.map((comp, idx) => (
                          <option key={idx} value={comp.name || comp.title || comp}>
                            {comp.name || comp.title || comp}
                          </option>
                        ))
                      ) : (
                        <option disabled>Loading competitions...</option>
                      )}
                    </select>
                    <div className="dropdown-arrow">⌄</div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Nama Tim</label>
                  <input
                    type="text"
                    name="name"
                    className="glass-input"
                    placeholder="Masukkan nama tim"
                    required
                    disabled={submitting || paymentPending}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 'clamp(1rem, 3vw, 1.1rem)', fontWeight: '600', marginBottom: '1rem', display: 'block' }}>
                    Data Ketua Tim
                  </label>
                  <div className="team-member-card glass-effect" style={{
                    padding: 'clamp(1rem, 3vw, 1.5rem)',
                    borderRadius: '12px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <span style={{
                        background: 'rgba(59, 130, 246, 0.8)',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
                        fontWeight: '600'
                      }}>
                        Ketua Tim
                      </span>
                    </div>

                    <input
                      type="text"
                      name="team_leader"
                      className="glass-input"
                      placeholder="Nama lengkap ketua tim"
                      value={teamLeader.name}
                      onChange={(e) => updateTeamLeader('name', e.target.value)}
                      required
                      disabled={submitting || paymentPending}
                      style={{ marginBottom: '0.75rem' }}
                    />

                    <input
                      type="tel"
                      className="glass-input"
                      placeholder="Nomor HP ketua tim"
                      value={teamLeader.phone}
                      onChange={(e) => updateTeamLeader('phone', e.target.value)}
                      required
                      disabled={submitting || paymentPending}
                      style={{ marginBottom: '0.75rem' }}
                    />

                    <label style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', marginTop: '0.5rem', display: 'block', fontWeight: '500' }}>
                      Pas Foto Ketua Tim
                    </label>
                    <input
                      type="file"
                      className="glass-input"
                      accept="image/*"
                      onChange={(e) => updateTeamLeader('photo', e.target.files[0])}
                      required
                      disabled={submitting || paymentPending}
                      style={{ marginBottom: '0.75rem' }}
                    />

                    <label style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', marginTop: '0.5rem', display: 'block', fontWeight: '500' }}>
                      Kartu Pelajar/Surat Keterangan
                    </label>
                    <input
                      type="file"
                      className="glass-input"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => updateTeamLeader('surat', e.target.files[0])}
                      required
                      disabled={submitting || paymentPending}
                      style={{ marginBottom: '0.75rem' }}
                    />

                    <label style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', marginTop: '0.5rem', display: 'block', fontWeight: '500' }}>
                      Pakta Integritas
                    </label>
                    <input
                      type="file"
                      className="glass-input"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => updateTeamLeader('pakta', e.target.files[0])}
                      required
                      disabled={submitting || paymentPending}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Anggota Tim (Selain Ketua)</label>
                  {teamMembers.length === 0 && (
                    <p style={{
                      fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '1rem',
                      fontStyle: 'italic'
                    }}>
                      Belum ada anggota tambahan. Klik tombol "Tambah Anggota" untuk menambahkan.
                    </p>
                  )}
                  {teamMembers.map((member, index) => (
                    <div key={`team-member-${index}`} className="team-member-card glass-effect" style={{
                      padding: 'clamp(0.75rem, 2.5vw, 1rem)',
                      marginBottom: '1rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                        <strong style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>Anggota {index + 1}</strong>
                        <button
                          type="button"
                          className="remove-member-btn"
                          onClick={() => removeTeamMember(index)}
                          disabled={submitting || paymentPending}
                          style={{
                            background: 'rgba(220, 38, 38, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            cursor: (submitting || paymentPending) ? 'not-allowed' : 'pointer',
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          ×
                        </button>
                      </div>

                      <input
                        type="text"
                        className="glass-input"
                        placeholder="Nama lengkap"
                        value={member.name}
                        onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                        required
                        disabled={submitting || paymentPending}
                        style={{ marginBottom: '0.5rem' }}
                      />

                      <input
                        type="tel"
                        className="glass-input"
                        placeholder="Nomor HP"
                        value={member.phone}
                        onChange={(e) => updateTeamMember(index, 'phone', e.target.value)}
                        required
                        disabled={submitting || paymentPending}
                        style={{ marginBottom: '0.5rem' }}
                      />

                      <label style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', marginTop: '0.5rem', display: 'block' }}>Pas Foto</label>
                      <input
                        type="file"
                        className="glass-input"
                        accept="image/*"
                        onChange={(e) => updateTeamMember(index, 'photo', e.target.files[0])}
                        required
                        disabled={submitting || paymentPending}
                        style={{ marginBottom: '0.5rem' }}
                      />

                      <label style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', marginTop: '0.5rem', display: 'block' }}>Kartu Pelajar/Surat Keterangan</label>
                      <input
                        type="file"
                        className="glass-input"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => updateTeamMember(index, 'surat', e.target.files[0])}
                        required
                        disabled={submitting || paymentPending}
                        style={{ marginBottom: '0.5rem' }}
                      />

                      <label style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', marginTop: '0.5rem', display: 'block' }}>Pakta Integritas</label>
                      <input
                        type="file"
                        className="glass-input"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => updateTeamMember(index, 'pakta', e.target.files[0])}
                        required
                        disabled={submitting || paymentPending}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-member-btn"
                    onClick={addTeamMember}
                    disabled={submitting || paymentPending}
                    style={{
                      opacity: (submitting || paymentPending) ? 0.5 : 1,
                      cursor: (submitting || paymentPending) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    + Tambah Anggota
                  </button>
                </div>

                <div className="form-group">
                  <label>Pendamping (Opsional)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => addOfficial('coach')}
                      disabled={submitting || paymentPending}
                      style={{
                        padding: 'clamp(0.4rem, 2vw, 0.5rem) clamp(0.75rem, 3vw, 1rem)',
                        background: 'rgba(59, 130, 246, 0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: (submitting || paymentPending) ? 'not-allowed' : 'pointer',
                        fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                        opacity: (submitting || paymentPending) ? 0.5 : 1
                      }}
                    >
                      + Coach
                    </button>
                    <button
                      type="button"
                      onClick={() => addOfficial('guru_pendamping')}
                      disabled={submitting || paymentPending}
                      style={{
                        padding: 'clamp(0.4rem, 2vw, 0.5rem) clamp(0.75rem, 3vw, 1rem)',
                        background: 'rgba(16, 185, 129, 0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: (submitting || paymentPending) ? 'not-allowed' : 'pointer',
                        fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                        opacity: (submitting || paymentPending) ? 0.5 : 1
                      }}
                    >
                      + Guru Pendamping
                    </button>
                    <button
                      type="button"
                      onClick={() => addOfficial('official')}
                      disabled={submitting || paymentPending}
                      style={{
                        padding: 'clamp(0.4rem, 2vw, 0.5rem) clamp(0.75rem, 3vw, 1rem)',
                        background: 'rgba(139, 92, 246, 0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: (submitting || paymentPending) ? 'not-allowed' : 'pointer',
                        fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                        opacity: (submitting || paymentPending) ? 0.5 : 1
                      }}
                    >
                      + Official
                    </button>
                  </div>

                  {officials.map((official, index) => (
                    <div key={`official-${index}`} className="official-card glass-effect" style={{
                      padding: 'clamp(0.75rem, 2.5vw, 1rem)',
                      marginBottom: '1rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                        <strong style={{ textTransform: 'capitalize', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
                          {official.role.replace('_', ' ')}
                        </strong>
                        <button
                          type="button"
                          onClick={() => removeOfficial(index)}
                          disabled={submitting || paymentPending}
                          style={{
                            background: 'rgba(220, 38, 38, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: (submitting || paymentPending) ? 'not-allowed' : 'pointer',
                            fontSize: '18px',
                            flexShrink: 0
                          }}
                        >
                          ×
                        </button>
                      </div>

                      <input
                        type="text"
                        className="glass-input"
                        placeholder="Nama lengkap"
                        value={official.name}
                        onChange={(e) => updateOfficial(index, 'name', e.target.value)}
                        required
                        disabled={submitting || paymentPending}
                        style={{ marginBottom: '0.5rem' }}
                      />

                      <input
                        type="tel"
                        className="glass-input" placeholder="Nomor Whatsapp"
                        value={official.phone}
                        onChange={(e) => updateOfficial(index, 'phone', e.target.value)}
                        required
                        disabled={submitting || paymentPending}
                        style={{ marginBottom: '0.5rem' }}
                      />

                      <label style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', marginTop: '0.5rem', display: 'block' }}>Pas Foto</label>
                      <input
                        type="file"
                        className="glass-input"
                        accept="image/*"
                        onChange={(e) => updateOfficial(index, 'photo', e.target.files[0])}
                        required
                        disabled={submitting || paymentPending}
                      />
                    </div>
                  ))}
                </div>

                {shouldShowSchool && (
                  <div className="form-group" style={{
                    animation: 'fadeIn 0.3s ease-in',
                  }}>
                    <label>Asal Sekolah</label>
                    <input
                      type="text"
                      name="school"
                      className="glass-input"
                      placeholder="Enter your school name"
                      required
                      disabled={submitting || paymentPending}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    className="glass-input"
                    placeholder="Enter your email"
                    required
                    disabled={submitting || paymentPending}
                  />
                </div>

                <div className="form-group">
                  <label>No. WhatsApp</label>
                  <input
                    type="tel"
                    name="whatsapp"
                    className="glass-input"
                    placeholder="Enter your WhatsApp number"
                    required
                    disabled={submitting || paymentPending}
                  />
                </div>

                <div className="form-group" style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  padding: 'clamp(0.75rem, 2.5vw, 1rem)',
                  borderRadius: '12px',
                  marginTop: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'clamp(1rem, 3vw, 1.1rem)', fontWeight: '600' }}>Total Biaya:</span>
                    <span style={{ fontSize: 'clamp(1.1rem, 4vw, 1.3rem)', fontWeight: '700', color: '#3b82f6' }}>
                      Rp {totalFee.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {selectedCompetition === "Short Movie" && (
                    <small style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem', display: 'block', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)' }}>
                      {teamMembers.length + 1 <= 5 ? (
                        <>
                          {teamMembers.length + 1} orang (termasuk dalam base fee)
                        </>
                      ) : (
                        <>
                          Base fee (5 orang) + {teamMembers.length + 1 - 5} orang × Rp 20.000
                        </>
                      )}
                    </small>
                  )}

                  {selectedCompetition && selectedCompetition !== "Short Movie" && (
                    <small style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem', display: 'block', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)' }}>
                      Harga flat per tim ({teamMembers.length + 1} orang)
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label>Konfirmasi Data</label>
                  <div className="checkbox-container" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      id="integrity-pact"
                      required
                      disabled={submitting || paymentPending}
                      style={{ marginTop: '0.25rem', flexShrink: 0 }}
                    />
                    <label htmlFor="integrity-pact" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)' }}>
                      Saya menyatakan bahwa data yang saya berikan adalah benar
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit-btn glass-effect"
                  disabled={submitting || paymentPending}
                  style={{
                    opacity: (submitting || paymentPending) ? 0.7 : 1,
                    cursor: (submitting || paymentPending) ? 'not-allowed' : 'pointer',
                    width: '100%',
                    padding: 'clamp(0.75rem, 3vw, 1rem)',
                    fontSize: 'clamp(0.9rem, 3vw, 1.1rem)'
                  }}
                >
                  {submitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(244, 228, 193, 0.3)',
                        borderTop: '2px solid #f4e4c1',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}></span>
                      Processing...
                    </span>
                  ) : paymentPending ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(244, 228, 193, 0.3)',
                        borderTop: '2px solid #f4e4c1',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}></span>
                      Waiting for Payment...
                    </span>
                  ) : 'Daftar & Bayar'}
                </button>

                {snapToken && !submitting && !paymentPending && (
                  <button
                    type="button"
                    onClick={() => handlePayment(snapToken)}
                    className="retry-payment-btn"
                    style={{
                      width: '100%',
                      padding: 'clamp(0.75rem, 3vw, 1rem)',
                      fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
                      marginTop: '0.5rem',
                      background: 'rgba(16, 185, 129, 0.8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🔄 Bayar Sekarang
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 0.5rem;
          }
          
          .registration-modal {
            width: 95% !important;
            max-height: 95vh !important;
          }
          
          .form-group label {
            font-size: 0.9rem;
          }
          
          .glass-input {
            font-size: 0.9rem;
            padding: 0.6rem;
          }
        }
        
        @media (max-width: 480px) {
          .modal-header h2 {
            font-size: 1.25rem;
          }
          
          .close-btn {
            font-size: 1.75rem;
          }
          
          .team-member-card,
          .official-card {
            padding: 0.75rem;
          }
        }
      `}</style>
    </>
  );
}

export default Home;