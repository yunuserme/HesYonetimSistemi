export default function App() {
  return (
    <div className="min-h-screen bg-black text-white p-8">

      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-6xl font-black text-cyan-400 tracking-wide">
          HES SCADA PANELİ
        </h1>

        <p className="text-zinc-400 text-xl mt-3">
          Gerçek Zamanlı Hidroelektrik Santral İzleme Sistemi
        </p>
      </div>

      {/* TOP STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10">

        <div className="bg-zinc-900 p-5 rounded-3xl border border-cyan-700 shadow-lg">
          <h2 className="text-zinc-400 text-sm mb-2">
            Toplam Üretim
          </h2>

          <p className="text-4xl font-black text-cyan-400">
            113 MW
          </p>
        </div>

        <div className="bg-zinc-900 p-5 rounded-3xl border border-green-700 shadow-lg">
          <h2 className="text-zinc-400 text-sm mb-2">
            Aktif Türbin
          </h2>

          <p className="text-4xl font-black text-green-400">
            3
          </p>
        </div>

        <div className="bg-zinc-900 p-5 rounded-3xl border border-yellow-600 shadow-lg">
          <h2 className="text-zinc-400 text-sm mb-2">
            Warning
          </h2>

          <p className="text-4xl font-black text-yellow-400">
            1
          </p>
        </div>

        <div className="bg-zinc-900 p-5 rounded-3xl border border-red-700 shadow-lg">
          <h2 className="text-zinc-400 text-sm mb-2">
            Kritik Alarm
          </h2>

          <p className="text-4xl font-black text-red-500">
            1
          </p>
        </div>

      </div>

      {/* TURBINE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

        {/* TURBINE 1 */}
        <div className="bg-zinc-900 border border-cyan-700 rounded-3xl p-6 shadow-2xl hover:scale-105 transition-all">

          <div className="flex justify-between items-center mb-5">
            <h2 className="text-3xl font-bold">
              Türbin-1
            </h2>

            <div className="bg-green-600 px-4 py-1 rounded-full text-sm font-bold">
              NORMAL
            </div>
          </div>

          <div className="space-y-4 text-lg">

            <div className="flex justify-between">
              <span>Su Seviyesi</span>
              <span className="text-cyan-400">%72</span>
            </div>

            <div className="flex justify-between">
              <span>Sıcaklık</span>
              <span className="text-cyan-400">55°C</span>
            </div>

            <div className="flex justify-between">
              <span>RPM</span>
              <span className="text-cyan-400">1450</span>
            </div>

            <div className="flex justify-between">
              <span>Üretim</span>
              <span className="text-cyan-400">32 MW</span>
            </div>

          </div>

          <button className="w-full mt-8 bg-red-600 hover:bg-red-700 p-4 rounded-2xl font-bold text-lg transition-all">
            ACİL DURDUR
          </button>

        </div>

        {/* TURBINE 2 */}
        <div className="bg-red-950 border border-red-500 rounded-3xl p-6 shadow-red-900 shadow-2xl animate-pulse hover:scale-105 transition-all">

          <div className="flex justify-between items-center mb-5">
            <h2 className="text-3xl font-bold">
              Türbin-2
            </h2>

            <div className="bg-red-600 px-4 py-1 rounded-full text-sm font-bold">
              KRİTİK
            </div>
          </div>

          <div className="space-y-4 text-lg">

            <div className="flex justify-between">
              <span>Su Seviyesi</span>
              <span className="text-red-400">%92</span>
            </div>

            <div className="flex justify-between">
              <span>Sıcaklık</span>
              <span className="text-red-400">89°C</span>
            </div>

            <div className="flex justify-between">
              <span>RPM</span>
              <span className="text-red-400">1700</span>
            </div>

            <div className="flex justify-between">
              <span>Üretim</span>
              <span className="text-red-400">44 MW</span>
            </div>

          </div>

          <div className="bg-red-700 mt-6 p-4 rounded-2xl text-center font-black text-lg">
            KRİTİK ALARM AKTİF
          </div>

          <button className="w-full mt-8 bg-red-600 hover:bg-red-700 p-4 rounded-2xl font-bold text-lg transition-all">
            ACİL DURDUR
          </button>

        </div>

        {/* TURBINE 3 */}
        <div className="bg-zinc-900 border border-yellow-500 rounded-3xl p-6 shadow-yellow-900 shadow-2xl hover:scale-105 transition-all">

          <div className="flex justify-between items-center mb-5">
            <h2 className="text-3xl font-bold">
              Türbin-3
            </h2>

            <div className="bg-yellow-500 text-black px-4 py-1 rounded-full text-sm font-bold">
              WARNING
            </div>
          </div>

          <div className="space-y-4 text-lg">

            <div className="flex justify-between">
              <span>Su Seviyesi</span>
              <span className="text-yellow-400">%80</span>
            </div>

            <div className="flex justify-between">
              <span>Sıcaklık</span>
              <span className="text-yellow-400">71°C</span>
            </div>

            <div className="flex justify-between">
              <span>RPM</span>
              <span className="text-yellow-400">1580</span>
            </div>

            <div className="flex justify-between">
              <span>Üretim</span>
              <span className="text-yellow-400">37 MW</span>
            </div>

          </div>

          <button className="w-full mt-8 bg-red-600 hover:bg-red-700 p-4 rounded-2xl font-bold text-lg transition-all">
            ACİL DURDUR
          </button>

        </div>

      </div>

      {/* GATE CONTROL */}
      <div className="mt-12 bg-zinc-900 border border-cyan-700 rounded-3xl p-8">

        <h2 className="text-4xl font-black text-cyan-400 mb-6">
          Savak Kapak Kontrolü
        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          <div>
            <label className="block mb-2 text-zinc-400">
              Kapak Seç
            </label>

            <select className="w-full bg-zinc-800 p-4 rounded-2xl">
              <option>Kapak-1</option>
              <option>Kapak-2</option>
              <option>Kapak-3</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-zinc-400">
              Açılış Yüzdesi
            </label>

            <input
              type="range"
              min="0"
              max="100"
              className="w-full"
            />

            <div className="text-cyan-400 mt-2 text-lg">
              %45
            </div>
          </div>

        </div>

        <button className="mt-8 bg-cyan-600 hover:bg-cyan-700 px-8 py-4 rounded-2xl font-bold text-lg">
          KAPAK KOMUTU GÖNDER
        </button>

      </div>

    </div>
  )
}