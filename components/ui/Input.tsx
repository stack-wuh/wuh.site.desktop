'use client'

import styled from 'styled-components'

const Field = `
  background: var(--background-color);
  color: var(--text-primary);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-base);
  padding: 5px 10px;
  font-size: 13px;
  font-family: var(--font-sans);
  transition: border-color var(--transition-fast) ease;

  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary-color) 18%, transparent);
  }

  &::placeholder {
    color: var(--text-muted);
  }
`

export const Input = styled.input`
  ${Field}
`

export const Textarea = styled.textarea`
  ${Field}
  resize: vertical;
  line-height: 1.6;
`

export const Select = styled.select`
  ${Field}
`
