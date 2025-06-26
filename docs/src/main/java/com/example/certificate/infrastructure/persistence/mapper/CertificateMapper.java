package com.example.certificate.infrastructure.persistence.mapper;

import com.example.certificate.domain.model.Certificate;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface CertificateMapper {
    @Insert("INSERT INTO certificates(certificate_number, type_id, title, content, status, issue_date, expiry_date) " +
            "VALUES(#{certificateNumber}, #{type.id}, #{title}, #{content}, #{status}, #{issueDate}, #{expiryDate})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insert(Certificate certificate);

    @Update("UPDATE certificates SET title=#{title}, content=#{content}, status=#{status}, " +
            "expiry_date=#{expiryDate} WHERE id=#{id}")
    void update(Certificate certificate);

    @Select("SELECT * FROM certificates WHERE id=#{id}")
    @Results({
        @Result(property = "id", column = "id"),
        @Result(property = "type", column = "type_id",
                one = @One(select = "com.example.certificate.infrastructure.persistence.mapper.CertificateTypeMapper.findById"))
    })
    Certificate findById(Long id);

    @Select("SELECT * FROM certificates WHERE certificate_number=#{certificateNumber}")
    Certificate findByNumber(String certificateNumber);

    @Select("SELECT * FROM certificates LIMIT #{limit} OFFSET #{offset}")
    @Results({
        @Result(property = "id", column = "id"),
        @Result(property = "type", column = "type_id",
                one = @One(select = "com.example.certificate.infrastructure.persistence.mapper.CertificateTypeMapper.findById"))
    })
    List<Certificate> findAll(@Param("offset") int offset, @Param("limit") int limit);
}