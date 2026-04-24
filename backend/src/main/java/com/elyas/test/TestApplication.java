package com.elyas.test;

import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TestApplication {

	public static void main(String[] args) {
		// Every fresh launch starts from a known demo state: wipe the
		// SQLite file BEFORE Hibernate connects, then ddl-auto=update
		// recreates the schema and DataInitializer reseeds fixtures.
		//
		// Within a single runtime everything persists normally — signing
		// out is purely a frontend concern (clears sessionStorage) and
		// does NOT touch the backend, so cross-role changes are still
		// visible until the backend process exits.
		resetDemoDatabase();
		SpringApplication.run(TestApplication.class, args);
	}

	private static void resetDemoDatabase() {
		// The -wal / -shm files are SQLite's write-ahead-log sidecars;
		// leaving them behind can leak state from a prior run.
		String[] candidates = {
			"data/mydatabase.db",
			"data/mydatabase.db-wal",
			"data/mydatabase.db-shm",
		};
		for (String rel : candidates) {
			try {
				Files.deleteIfExists(Path.of(rel));
			} catch (Exception e) {
				System.err.println("SwiftServe: could not delete " + rel + " — " + e.getMessage());
			}
		}
	}

}
