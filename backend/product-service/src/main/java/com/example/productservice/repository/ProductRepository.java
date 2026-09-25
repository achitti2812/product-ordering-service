package com.example.productservice.repository;

import com.example.productservice.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Product product
            set product.stock = product.stock - :quantity
            where product.id = :id and product.stock >= :quantity
            """)
    int reduceStockIfAvailable(@Param("id") Long id, @Param("quantity") int quantity);
}
