'use client'

import { useState, useEffect } from 'react'
import { MdCloudUpload, MdCheckCircle, MdError } from 'react-icons/md'
import { needsMigration, migrateLocalStorageToAPI, skipMigration, type MigrationReport } from '@/lib/migration'

export default function MigrationModal() {
  const [show, setShow] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState<MigrationReport | null>(null)

  useEffect(() => {
    if (needsMigration()) {
      setShow(true)
    }
  }, [])

  async function handleMigrate() {
    setMigrating(true)
    setProgress(10)

    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90))
    }, 300)

    try {
      const result = await migrateLocalStorageToAPI()
      setReport(result)
      setProgress(100)
      clearInterval(interval)

      setTimeout(() => {
        setShow(false)
        window.location.reload()
      }, 2000)
    } catch (error) {
      clearInterval(interval)
      setReport({
        success: false,
        clienteCriado: false,
        orcamentosCriados: 0,
        erros: [String(error)],
      })
      setProgress(0)
      setMigrating(false)
    }
  }

  function handleSkip() {
    skipMigration()
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="card bg-base-100 shadow-xl max-w-md w-full mx-4">
        <div className="card-body gap-4">
          <div className="flex items-center gap-3">
            <MdCloudUpload className="text-4xl text-primary" />
            <h2 className="card-title text-xl">Migração de Dados</h2>
          </div>

          {!migrating && !report && (
            <>
              <p className="text-sm">
                Detectamos dados armazenados localmente. Deseja migrar seus dados para a nuvem?
              </p>
              <div className="card-actions justify-end gap-2">
                <button className="btn btn-ghost btn-sm" onClick={handleSkip}>
                  Pular
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleMigrate}>
                  Migrar agora
                </button>
              </div>
            </>
          )}

          {migrating && (
            <>
              <p className="text-sm">Migrando dados para a nuvem...</p>
              <progress className="progress progress-primary w-full" value={progress} max="100" />
              <p className="text-xs text-center">{progress}%</p>
            </>
          )}

          {report && (
            <>
              {report.success ? (
                <div className="flex items-center gap-2 text-success">
                  <MdCheckCircle className="text-2xl" />
                  <p className="text-sm font-semibold">Migração concluída!</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-error">
                  <MdError className="text-2xl" />
                  <p className="text-sm font-semibold">Erros na migração</p>
                </div>
              )}

              <div className="text-xs space-y-1">
                {report.clienteCriado && <p>✓ Cliente criado</p>}
                {report.orcamentosCriados > 0 && (
                  <p>✓ {report.orcamentosCriados} orçamento(s) criado(s)</p>
                )}
                {report.erros.map((erro, i) => (
                  <p key={i} className="text-error">
                    ✗ {erro}
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
