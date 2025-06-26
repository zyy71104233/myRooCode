package com.example.certificate.infrastructure.persistence.mapper;

import com.example.certificate.domain.model.CertificateType;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface CertificateTypeMapper {
    @Insert("INSERT INTO certificate_types(type_name, description, validity_period) " +
            "VALUES(#{typeName}, #{description}, #{validityPeriod})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insert(CertificateType certificateType);

    @Update("UPDATE certificate_types SET type_name=#{typeName}, description=#{description}, " +
            "validity_period=#{validityPeriod} WHERE id=#{id}")
    void update(CertificateType certificateType);

    @Select("SELECT * FROM certificate_types WHERE id=#{id}")
    CertificateType findById(Long id);

    @Select("SELECT * FROM certificate_types WHERE type_name=#{typeName}")
    CertificateType findByTypeName(String typeName);

    @Select("SELECT * FROM certificate_types")
    List<CertificateType> findAll();
}