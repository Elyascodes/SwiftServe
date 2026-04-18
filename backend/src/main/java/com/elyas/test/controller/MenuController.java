package com.elyas.test.controller;

import com.elyas.test.model.MenuItem;
import com.elyas.test.repository.MenuItemRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/menu")
public class MenuController {

    private final MenuItemRepository repo;

    public MenuController(MenuItemRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<MenuItem> getActiveMenu() {
        return repo.findByIsActiveTrueOrderByCategoryAscNameAsc();
    }

    @GetMapping("/all")
    public List<MenuItem> getAllItems() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getItem(@PathVariable Long id) {
        return repo.findById(id)
                .map(item -> ResponseEntity.ok((Object) item))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateItem(@PathVariable Long id,
                                        @RequestBody Map<String, Object> body) {
        Optional<MenuItem> found = repo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        MenuItem item = found.get();
        if (body.containsKey("name"))        item.setName((String) body.get("name"));
        if (body.containsKey("price"))       item.setPrice(((Number) body.get("price")).doubleValue());
        if (body.containsKey("category"))    item.setCategory((String) body.get("category"));
        if (body.containsKey("ingredients")) item.setIngredients((String) body.get("ingredients"));
        repo.save(item);

        return ResponseEntity.ok(item);
    }

    @PutMapping("/{id}/stock")
    public ResponseEntity<?> updateStock(@PathVariable Long id,
                                         @RequestBody Map<String, Object> body) {
        Optional<MenuItem> found = repo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        MenuItem item = found.get();
        if (body.containsKey("stock")) {
            Number stock = (Number) body.get("stock");
            item.setStock(stock != null ? stock.intValue() : null);
        }
        if (body.containsKey("expirationDate")) {
            item.setExpirationDate((String) body.get("expirationDate"));
        }
        repo.save(item);

        return ResponseEntity.ok(item);
    }

    @PutMapping("/{id}/availability")
    public ResponseEntity<?> toggleAvailability(@PathVariable Long id,
                                                @RequestBody Map<String, Object> body) {
        Optional<MenuItem> found = repo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();

        MenuItem item = found.get();
        Boolean active = (Boolean) body.get("isActive");
        if (active != null) {
            item.setIsActive(active);
            repo.save(item);
        }

        return ResponseEntity.ok(item);
    }
}
