import React from 'react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { serialize, ACCOUNTS } from '../utils'

export default function Payment({ currentWallet }) {
  const location = useLocation()
  const [validated, setValidated] = useState(false)
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isCoinjoin, setIsCoinjoin] = useState(false)
  const [account, setAccount] = useState(location.state?.account || 0)

  const sendPayment = async (account, destination, amount_sats) => {
    const { name, token } = currentWallet
    const opts = {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        mixdepth: account,
        destination,
        amount_sats
      })
    }

    setAlert(null)
    setIsSending(true)
    let success = false
    try {
      const res = await fetch(`/api/v1/wallet/${name}/taker/direct-send`, opts)
      if (res.ok) {
        const { txinfo: { outputs } } = await res.json()
        const output = outputs.find(o => o.address === destination)
        setAlert({ variant: 'success', message: `Payment successful: Sent ${output.value_sats} sats to ${output.address}.` })
        success = true
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsSending(false)
    }

    return success
  }

  const startCoinjoin = async (account, destination, amount_sats, counterparties) => {
    const { name, token } = currentWallet
    const opts = {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        mixdepth: account,
        destination,
        amount_sats,
        counterparties
      }),
    }

    setAlert(null)
    setIsSending(true)
    let success = false
    try {
      const res = await fetch(`/api/v1/wallet/${name}/taker/coinjoin`, opts)
      if (res.ok) {
        const data = await res.json()
        console.log(data)
        setAlert({ variant: 'success', message: 'Coinjoin started' })
        success = true
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsSending(false)
    }

    return success
  }

  const onSubmit = async e => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = form.checkValidity()
    setValidated(true)

    if (isValid) {
      const { account, amount, counterparties, destination } = serialize(form)
      const success = isCoinjoin
        ? await startCoinjoin(account, destination, amount, counterparties)
        : await sendPayment(account, destination, amount)

      if (success) {
        form.reset()
        setIsCoinjoin(false)
        setValidated(false)
      }
    }
  }

  return (
    <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
      <h1>Send Payment</h1>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      <rb.Form.Group className="mb-3" controlId="destination">
        <rb.Form.Label>Receiver Address</rb.Form.Label>
        <rb.Form.Control name="destination" defaultValue="" required style={{ maxWidth: '50ch' }} />
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="account">
        <rb.Form.Label>Account</rb.Form.Label>
        <rb.Form.Control name="account" type="number" value={account} min={ACCOUNTS[0]} max={ACCOUNTS[4]} onChange={e => setAccount(parseInt(e.target.value, 10))} style={{ width: '15ch' }} required />
        <rb.Form.Control.Feedback type="invalid">Please provide an account between {ACCOUNTS[0]} and {ACCOUNTS[4]}.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="amount">
        <rb.Form.Label>Amount in Sats</rb.Form.Label>
        <rb.Form.Control name="amount" type="number" min={0} defaultValue={0} required style={{ maxWidth: '15ch' }}/>
        <rb.Form.Control.Feedback type="invalid">Please provide a receiving address.</rb.Form.Control.Feedback>
      </rb.Form.Group>
      <rb.Form.Group className="mb-3" controlId="isCoinjoin">
        <rb.Form.Check type="switch" label="As coinjoin" value={true} onChange={(e) => setIsCoinjoin(e.target.checked)} />
      </rb.Form.Group>
      {isCoinjoin === true &&
        <rb.Form.Group className="mb-3" controlId="counterparties">
          <rb.Form.Label>Number of counterparties</rb.Form.Label>
          <rb.Form.Control name="counterparties" type="number" min={0} defaultValue={3} style={{ width: '10ch' }} required />
          <rb.Form.Control.Feedback type="invalid">Please set the counterparties.</rb.Form.Control.Feedback>
        </rb.Form.Group>}
      <rb.Button variant="dark" type="submit" disabled={isSending}>
        {isSending
          ? <div>
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            Sending
          </div>
          : 'Send'}
      </rb.Button>
    </rb.Form>
  )
}