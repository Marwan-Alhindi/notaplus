"use client";
import React from 'react';
import styles from "@/styles/Note.module.css";

interface NoteProps {
  title: string;
  description: string;
  createdAt: string;
  tags?: string[];
  selected?: boolean; // Add selected prop
}

export function Note({ title, description, createdAt, tags, selected }: NoteProps) {
  return (
    <div className={`${styles.noteCard} ${selected ? styles.selected : ''}`}>
      <div className={styles.noteHeader}>
        <h2 className={styles.noteTitle}>{title}</h2>
        <div className={styles.noteMeta}>
          <span>{createdAt}</span>
          {tags?.map((tag) => (
            <span key={tag} className={styles.noteTag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.noteContent}>
        <p className={styles.noteDescription}>{description}</p>
      </div>
    </div>
  );
}